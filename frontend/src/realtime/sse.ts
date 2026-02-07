import { fetchWithGuards } from "@/api/fetch";

export type SseEvent = {
  event?: string;
  data: string;
  id?: string;
  /** raw event text with \n newlines, without trailing blank line */
  raw: string;
};

export type SseConnectOptions = {
  url: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: HeadersInit;

  /** Called for every parsed SSE event (including empty data events). */
  onEvent: (event: SseEvent) => void;

  /** Called on non-abort errors and on fetch/network failures. */
  onError?: (error: unknown) => void;

  /** Optional AbortSignal from caller; otherwise internal controller is used. */
  signal?: AbortSignal;

  /**
   * Auto-reconnect behavior (EventSource-like). Default: false.
   * - If true: will reconnect after network errors / non-2xx / stream closes unexpectedly.
   * - If false: one-shot stream, no reconnect.
   */
  autoReconnect?: boolean;

  /**
   * Initial reconnect delay in ms. Default: 3000.
   * Server can override via `retry:` field (spec).
   */
  retryDelayMs?: number;

  /** Max reconnect delay cap in ms for backoff. Default: 15000. */
  maxRetryDelayMs?: number;

  /** Backoff multiplier. Default: 1.5 */
  backoffFactor?: number;

  /** Optional jitter ratio (0~1). Default: 0.2 */
  jitterRatio?: number;

  /**
   * If true, includes `Last-Event-ID` header when reconnecting (if an id was received).
   * Default: true.
   */
  sendLastEventId?: boolean;

  /**
   * If set, aborts/reconnects when no bytes received within this time.
   * Useful behind proxies/load balancers. Default: undefined (disabled).
   */
  readTimeoutMs?: number;

  /**
   * Safety guard to prevent unbounded memory usage if server never sends a boundary.
   * If buffer grows beyond this, throws. Default: 2MB.
   */
  maxBufferBytes?: number;
};

export type SseConnection = {
  close: () => void;
  /** current reconnect delay (ms) */
  getRetryDelay: () => number;
  /** last received event id (for reconnect) */
  getLastEventId: () => string | undefined;
};

/**
 * Minimal EventSource helper (GET only, no headers/body).
 * Use connectSseStream for GPT-like POST+Auth streaming.
 */
export function connectSse(url: string, onMessage: (event: MessageEvent) => void) {
  const source = new EventSource(url);
  source.addEventListener("message", onMessage);
  return () => source.close();
}

/**
 * Robust SSE client over fetch streaming.
 * - Supports POST + headers (Auth)
 * - Parses SSE per spec (event/id/data/retry, comments)
 * - Handles CRLF/LF boundaries
 * - Optional auto-reconnect with backoff + jitter
 * - Flushes final partial event on close
 */
export async function connectSseStream(options: SseConnectOptions): Promise<SseConnection> {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const signal = externalSignal ?? controller.signal;

  const autoReconnect = options.autoReconnect ?? false;
  const sendLastEventId = options.sendLastEventId ?? true;

  let retryDelayMs = options.retryDelayMs ?? 3000;
  const maxRetryDelayMs = options.maxRetryDelayMs ?? 15000;
  const backoffFactor = options.backoffFactor ?? 1.5;
  const jitterRatio = options.jitterRatio ?? 0.2;

  const maxBufferBytes = options.maxBufferBytes ?? 2 * 1024 * 1024;

  let lastEventId: string | undefined;
  let closedByUser = false;

  // If caller aborts, we close too.
  if (externalSignal) {
    if (externalSignal.aborted) {
      closedByUser = true;
      controller.abort();
    } else {
      externalSignal.addEventListener(
        "abort",
        () => {
          closedByUser = true;
          controller.abort();
        },
        { once: true }
      );
    }
  }

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      // If aborted while sleeping, resolve immediately
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          resolve();
        },
        { once: true }
      );
    });

  const withJitter = (ms: number) => {
    const j = Math.max(0, Math.min(1, jitterRatio));
    if (j === 0) return ms;
    const delta = ms * j;
    // random in [ms-delta, ms+delta]
    const v = ms - delta + Math.random() * (2 * delta);
    return Math.max(0, Math.floor(v));
  };

  const computeNextDelay = (current: number) => {
    const next = Math.min(maxRetryDelayMs, Math.floor(current * backoffFactor));
    return next <= 0 ? 1000 : next;
  };

  const buildHeaders = () => {
    const headers = new Headers(options.headers);
    headers.set("Accept", "text/event-stream");

    // Only set Content-Type when we actually send a body.
    const method = options.method ?? "POST";
    const isBodyAllowed = method !== "GET" && method !== "HEAD";
    if (isBodyAllowed && options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (sendLastEventId && lastEventId && !headers.has("Last-Event-ID")) {
      headers.set("Last-Event-ID", lastEventId);
    }

    // Some proxies buffer unless asked not to (mainly relevant for nginx).
    // Harmless if ignored.
    if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-cache");

    return headers;
  };

  const buildRequest = () => {
    const method = options.method ?? "POST";
    const body =
      method === "GET" || method === "HEAD" || options.body === undefined ? undefined : JSON.stringify(options.body);
    return { method, body };
  };

  const parseAndDispatch = (rawEvent: string) => {
    // rawEvent should already use \n newlines and contain no trailing blank line.
    // Parse per SSE spec.
    let eventName: string | undefined;
    let eventId: string | undefined;
    let data = "";
    let sawData = false;

    const lines = rawEvent.split("\n");
    for (const line of lines) {
      if (line.startsWith(":")) {
        // comment line -> ignore
        continue;
      }

      // Field parsing: "field:value" (value may be empty); if no ":", ignore line
      const idx = line.indexOf(":");
      if (idx === -1) continue;

      const field = line.slice(0, idx);
      let value = line.slice(idx + 1);
      // If value begins with a single space, strip it (spec).
      if (value.startsWith(" ")) value = value.slice(1);

      if (field === "event") {
        eventName = value;
      } else if (field === "id") {
        // Spec: if value contains NUL, ignore it. We'll strip it.
        const cleaned = value.replace(/\u0000/g, "");
        eventId = cleaned;
        lastEventId = cleaned;
      } else if (field === "retry") {
        // If valid integer, set retry delay.
        const n = parseInt(value, 10);
        if (Number.isFinite(n) && n >= 0) retryDelayMs = n;
      } else if (field === "data") {
        // Append with \n between data lines.
        data += (sawData ? "\n" : "") + value;
        sawData = true;
      }
    }

    // Dispatch even if data is empty string (valid SSE event).
    options.onEvent({
      event: eventName,
      id: eventId,
      data,
      raw: rawEvent,
    });
  };

  const runOnce = async () => {
    const headers = buildHeaders();
    const { method, body } = buildRequest();

    const response = await fetchWithGuards(options.url, {
      method,
      headers,
      body,
      signal,
    });

    if (!response.ok || !response.body) {
      const error = new Error(`SSE connection failed with status ${response.status}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let isFirstChunk = true;

    // For read-timeout: reset timer every time bytes arrive.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const armTimeout = () => {
      if (!options.readTimeoutMs) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Trigger reconnect by aborting this fetch (but not marking user-close).
        try {
          reader.cancel().catch(() => {});
        } catch {}
      }, options.readTimeoutMs);
    };

    const clearTimeoutIfAny = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const findBoundaryIndex = () => {
      // We support both LF and CRLF event separators:
      // - "\n\n"
      // - "\r\n\r\n"
      const lf = buffer.indexOf("\n\n");
      const crlf = buffer.indexOf("\r\n\r\n");

      if (lf === -1) return crlf;
      if (crlf === -1) return lf;
      return Math.min(lf, crlf);
    };

    const consumeEventsFromBuffer = () => {
      // Guard memory usage
      if (buffer.length > maxBufferBytes) {
        throw new Error(`SSE buffer exceeded maxBufferBytes (${maxBufferBytes}). Possible missing event boundary.`);
      }

      let boundaryIndex = findBoundaryIndex();
      while (boundaryIndex !== -1) {
        const boundaryLength = buffer.slice(boundaryIndex, boundaryIndex + 4) === "\r\n\r\n" ? 4 : 2;

        // Normalize CRLF -> LF inside event
        const rawEvent = buffer.slice(0, boundaryIndex).replace(/\r\n/g, "\n");
        buffer = buffer.slice(boundaryIndex + boundaryLength);

        // Recompute next boundary
        boundaryIndex = findBoundaryIndex();

        // Ignore empty event blocks
        if (!rawEvent.trim()) continue;

        parseAndDispatch(rawEvent);
      }
    };

    try {
      armTimeout();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        armTimeout();

        let chunk = decoder.decode(value, { stream: true });
        if (isFirstChunk) {
          isFirstChunk = false;
          // strip UTF-8 BOM if present
          chunk = chunk.replace(/^\uFEFF/, "");
        }

        buffer += chunk;
        consumeEventsFromBuffer();
      }

      // Flush any final partial event if server closed without trailing blank line
      if (buffer.trim()) {
        buffer = buffer.replace(/\r\n/g, "\n");
        // If it contains at least one field line, treat as an event and dispatch once.
        // We simulate the missing boundary.
        parseAndDispatch(buffer);
      }
    } finally {
      clearTimeoutIfAny();
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }
  };

  const loop = async () => {
    // Reset to initial delay on successful connect completion? (EventSource doesn't “complete” normally.)
    // We'll only increase delay after failures; a successful runOnce that ends will still be treated as “ended” and can reconnect.
    let currentDelay = retryDelayMs;

    while (!signal.aborted && !closedByUser) {
      try {
        await runOnce();

        // If stream ends normally and we're not reconnecting, exit.
        if (!autoReconnect) break;

        // Stream ended unexpectedly -> reconnect after delay
        await sleep(withJitter(currentDelay));
        currentDelay = computeNextDelay(currentDelay);
      } catch (err) {
        if ((err as Error)?.name === "AbortError" || signal.aborted || closedByUser) break;

        options.onError?.(err);

        if (!autoReconnect) break;

        await sleep(withJitter(currentDelay));
        currentDelay = computeNextDelay(currentDelay);
      } finally {
        // Keep retryDelayMs aligned with server-provided `retry:` if updated.
        currentDelay = retryDelayMs;
      }
    }
  };

  // Fire and forget loop; caller controls via close() / external signal.
  loop();

  return {
    close: () => {
      closedByUser = true;
      controller.abort();
    },
    getRetryDelay: () => retryDelayMs,
    getLastEventId: () => lastEventId,
  };
}
