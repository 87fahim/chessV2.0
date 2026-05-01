// Utility to get or generate a persistent client session ID
export function getClientSessionId(): string {
  let id = localStorage.getItem('clientSessionId');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('clientSessionId', id);
  }
  return id;
}
