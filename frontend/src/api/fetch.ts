import { emitGate } from "@/app/events";
import { clearAccessToken, getAccessToken } from "@/lib/auth";

async function tryReadMessage(response: Response) {
  try {
    const body = (await response.clone().json()) as { message?: string; trace_id?: string };
    return { message: body.message, traceId: body.trace_id };
  } catch {
    return {};
  }
}

export async function fetchWithGuards(input: RequestInfo, init?: RequestInit) {
  const headers = new Headers(init?.headers || {});
  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 402) {
    const detail = await tryReadMessage(response);
    emitGate("billing-required", { status: 402, ...detail });
  }

  if (response.status === 403) {
    const detail = await tryReadMessage(response);
    emitGate("permission-forbidden", { status: 403, ...detail });
  }

  if (response.status === 401) {
    const url = typeof input === "string" ? input : input.url;
    if (!url.includes("/api/v1/identity/token") && !url.includes("/api/v1/identity/register")) {
      const detail = await tryReadMessage(response);
      clearAccessToken();
      emitGate("auth-required", { status: 401, ...detail });
    }
  }

  return response;
}
