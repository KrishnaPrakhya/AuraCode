/**
 * WebSocket Manager
 * Handles real-time communication for live problem updates
 */

type MessageHandler = (data: any) => void;

interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnecting = false;

  constructor(url: string = '') {
    // Use window location in browser, fallback to localhost
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.url = url || `${protocol}//${host}/api/ws`;
    } else {
      this.url = url || 'ws://localhost:3000/api/ws';
    }
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    if (this.isConnecting) {
      return; // Already connecting
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[v0] WebSocket connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this._handleMessage(message);
          } catch (error) {
            console.error('[v0] Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[v0] WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[v0] WebSocket disconnected');
          this.isConnecting = false;
          this._attemptReconnect();
        };
      } catch (error) {
        console.error('[v0] Failed to create WebSocket:', error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[v0] WebSocket not connected, queueing message');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[v0] Failed to send WebSocket message:', error);
    }
  }

  /**
   * Register handler for message type
   */
  on(messageType: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(messageType)) {
      this.handlers.set(messageType, new Set());
    }

    this.handlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(messageType)?.delete(handler);
    };
  }

  /**
   * Emit message to all handlers of type
   */
  private _handleMessage(message: WebSocketMessage): void {
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error(`[v0] Error in ${message.type} handler:`, error);
        }
      });
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private _attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[v0] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[v0] Attempting reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[v0] Reconnection failed:', error);
      });
    }, delay);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get current state
   */
  getState(): 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' {
    if (!this.ws) return 'CLOSED';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'CLOSED';
    }
  }
}

// Singleton instance
let wsManagerInstance: WebSocketManager | null = null;

export function getWebSocketManager(): WebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager();
  }
  return wsManagerInstance;
}
