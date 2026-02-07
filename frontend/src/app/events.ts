export type GateReason = "billing-required" | "permission-forbidden" | "auth-required";

export interface GateDetail {
  status: number;
  message?: string;
  traceId?: string;
}

export const appEvents = new EventTarget();

export function emitGate(reason: GateReason, detail: GateDetail) {
  appEvents.dispatchEvent(new CustomEvent(reason, { detail }));
}
