import type { Socket } from 'socket.io-client';

export async function connectSocket(socket: Socket, timeoutMs = 5_000): Promise<void> {
  if (socket.connected) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for socket connection'));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
    };

    const handleConnect = () => {
      cleanup();
      resolve();
    };

    const handleConnectError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once('connect', handleConnect);
    socket.once('connect_error', handleConnectError);
    socket.connect();
  });
}

export async function waitForSocketEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 5_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for socket event: ${event}`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(event, handleEvent);
      socket.off('connect_error', handleConnectError);
    };

    const handleEvent = (payload: T) => {
      cleanup();
      resolve(payload);
    };

    const handleConnectError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once(event, handleEvent);
    socket.once('connect_error', handleConnectError);
  });
}