import { useEffect, useState, useCallback } from 'react';
import { getWebSocketManager } from '@/lib/websocket/manager';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
}

/**
 * Hook for WebSocket connection management
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { url, autoConnect = false } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const manager = getWebSocketManager();

  // Auto-connect on mount
  useEffect(() => {
    if (!autoConnect) return;

    const connect = async () => {
      try {
        setIsConnecting(true);
        await manager.connect();
        setIsConnected(true);
        setError(null);
      } catch {
        // WS not available in Next.js App Router — fail silently
        setIsConnected(false);
      } finally {
        setIsConnecting(false);
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      // Don't disconnect, keep connection alive
      // manager.disconnect();
    };
  }, [autoConnect, manager]);

  // Monitor connection state
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(manager.isConnected());
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, [manager]);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      await manager.connect();
      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [manager]);

  const disconnect = useCallback(() => {
    manager.disconnect();
    setIsConnected(false);
  }, [manager]);

  const send = useCallback(
    (message: { type: string; payload: any }) => {
      manager.send({
        ...message,
        timestamp: Date.now(),
      });
    },
    [manager]
  );

  const subscribe = useCallback(
    (messageType: string, handler: (data: any) => void) => {
      return manager.on(messageType, handler);
    },
    [manager]
  );

  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    send,
    subscribe,
  };
}
