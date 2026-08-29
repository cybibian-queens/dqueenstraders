export type NewApiWsMessage = Record<string, unknown>;
type MessageHandler = (message: NewApiWsMessage) => void;

interface PendingRequest {
  resolve: (message: NewApiWsMessage) => void;
  reject: (error: Error) => void;
  timer: number;
}

export class OptionsWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();
  private subscriptions = new Map<string, MessageHandler>();
  private pending = new Map<number, PendingRequest>();
  private openPromise: Promise<void> | null = null;
  private closed = false;
  private reqId = 0;

  constructor(private readonly url: string) {
    if (!url.startsWith('wss://api.derivws.com/trading/v1/options/ws/')) {
      throw new Error('Invalid New API Options WebSocket URL');
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
          this.handleMessage(JSON.parse(String(event.data)) as NewApiWsMessage);
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
        for (const pending of this.pending.values()) {
          window.clearTimeout(pending.timer);
          pending.reject(new Error('New API WebSocket connection closed'));
        }
        this.pending.clear();
        this.subscriptions.clear();
      };
    });

    return this.openPromise;
  }

  private handleMessage(message: NewApiWsMessage): void {
    this.handlers.forEach(handler => handler(message));

    const reqId = Number(message.req_id);
    if (reqId && this.pending.has(reqId)) {
      const pending = this.pending.get(reqId)!;
      window.clearTimeout(pending.timer);
      this.pending.delete(reqId);
      if (message.error) {
        const error = message.error as Record<string, unknown>;
        pending.reject(new Error(String(error.message ?? error.code ?? 'Deriv request failed')));
      } else {
        pending.resolve(message);
      }
    }

    const subscription = message.subscription;
    if (subscription && typeof subscription === 'object') {
      const id = String((subscription as Record<string, unknown>).id ?? '');
      const handler = id ? this.subscriptions.get(id) : undefined;
      if (handler) handler(message);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(message: NewApiWsMessage): number {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('New API WebSocket is not connected');
    }
    const reqId = Number(message.req_id ?? ++this.reqId);
    this.ws.send(JSON.stringify({ ...message, req_id: reqId }));
    return reqId;
  }

  async request(message: NewApiWsMessage, timeoutMs = 15000): Promise<NewApiWsMessage> {
    await this.connect();
    const reqId = Number(message.req_id ?? ++this.reqId);
    const request = { ...message, req_id: reqId };

    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error(`New API request timed out: ${String(Object.keys(message)[0] ?? 'request')}`));
      }, timeoutMs);
      this.pending.set(reqId, { resolve, reject, timer });
      try {
        this.send(request);
      } catch (error) {
        window.clearTimeout(timer);
        this.pending.delete(reqId);
        reject(error instanceof Error ? error : new Error('Failed to send request'));
      }
    });
  }

  async subscribe(
    message: NewApiWsMessage,
    handler: MessageHandler,
    timeoutMs = 15000,
  ): Promise<{ subscriptionId: string; unsubscribe: () => void }> {
    const response = await this.request({ ...message, subscribe: 1 }, timeoutMs);
    const subscription = response.subscription;
    if (!subscription || typeof subscription !== 'object') {
      throw new Error('Deriv did not return a subscription ID');
    }
    const subscriptionId = String((subscription as Record<string, unknown>).id ?? '');
    if (!subscriptionId) throw new Error('Deriv returned an empty subscription ID');

    this.subscriptions.set(subscriptionId, handler);
    return {
      subscriptionId,
      unsubscribe: () => {
        this.subscriptions.delete(subscriptionId);
        this.request({ forget: subscriptionId }, 10000).catch(() => undefined);
      },
    };
  }

  close(): void {
    this.closed = true;
    this.openPromise = null;
    for (const pending of this.pending.values()) {
      window.clearTimeout(pending.timer);
      pending.reject(new Error('WebSocket closed'));
    }
    this.pending.clear();
    this.subscriptions.clear();
    this.ws?.close();
    this.ws = null;
  }

  get isOpen(): boolean {
    return !this.closed && this.ws?.readyState === WebSocket.OPEN;
  }
}
