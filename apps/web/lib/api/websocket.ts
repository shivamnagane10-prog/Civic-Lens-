import { WebSocketMessage } from '@civiclens/shared-types';

export type MessageHandler = (message: WebSocketMessage) => void;

export class LiveSocket {
  private url: string;
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectInterval = 3000;
  private isExplicitlyClosed = false;

  constructor(url = 'ws://localhost:8000/ws') {
    this.url = url;
  }

  connect() {
    if (typeof window === 'undefined') return;
    this.isExplicitlyClosed = false;

    try {
      const host = window.location.hostname || 'localhost';
      const targetUrl = this.url.includes('localhost') ? `ws://${host}:8000/ws` : this.url;
      this.ws = new WebSocket(targetUrl);

      this.ws.onopen = () => {
        console.log('[CivicLens WS] Connected to live event stream');
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          this.handlers.forEach((handler) => handler(data));
        } catch (e) {
          // pong or non-json
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[CivicLens WS] Connection error, will retry...', err);
        this.ws?.close();
      };
    } catch (e) {
      console.warn('[CivicLens WS] Initialization error:', e);
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const liveSocket = new LiveSocket();
