export function connectWebSocket(url: string, onMessage: (event: MessageEvent) => void) {
  const socket = new WebSocket(url);
  socket.addEventListener("message", onMessage);
  return () => socket.close();
}
