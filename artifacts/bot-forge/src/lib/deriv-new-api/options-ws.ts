export type NewApiWsMessage = Record<string, unknown>;

type MessageHandler = (message: NewApiWsMessage) => void;

export class OptionsWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private openPromise: Promise<void> | null = null;
  private closed = false;

  constructor(private readonly url: string) {
    if (!url.startsWith('wss://api.derivws.com/')) {
      throw new Error('Invalid New API WebSocket URL');
    }
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.openPromise) return this.openPromise;

    this.closed = false;
    this.openPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.openPromise = null;
        resolve();
      };

      ws.onmessage = event => {
        try {
          const message = JSON.parse(String(event.data)) as NewApiWsMessage;
          this.handlers.forEach(handler => handler(message));
        } catch (error) {
          console.error('[New API] Invalid WebSocket message', error);
        }
      };

      ws.onerror = () => {
        this.openPromise = null;
        reject(new Error('New API WebSocket connection failed'));
      };

      ws.onclose = () => {
        this.openPromise = null;
        this.ws = null;
      };
    });

    return this.openPromise;
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(message: NewApiWsMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('New API WebSocket is not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  async request(message: NewApiWsMessage, timeoutMs = 15000): Promise<NewApiWsMessage> {
    await this.connect();
    const reqId = Number(message.req_id ?? Date.now() % 2147483647);
    const request = { ...message, req_id: reqId };

    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        unsubscribe();
        reject(new Error(`New API request timed out: ${String(message.msg_type ?? Object.keys(message)[0] ?? 'request')}`));
      }, timeoutMs);

      const unsubscribe = this.onMessage(response => {
        if (Number(response.req_id) !== reqId) return;
        window.clearTimeout(timer);
        unsubscribe();
        if (response.error) {
          const error = response.error as Record<string, unknown>;
          reject(new Error(String(error.message ?? error.code ?? 'Deriv request failed')));
          return;
        }
        resolve(response);
      });

      try {
        this.send(request);
      } catch (error) {
        window.clearTimeout(timer);
        unsubscribe();
        reject(error);
      }
    });
  }

  close(): void {
    this.closed = true;
    this.openPromise = null;
    this.ws?.close();
    this.ws = null;
  }

  get isOpen(): boolean {
    return !this.closed && this.ws?.readyState === WebSocket.OPEN;
  }
}
