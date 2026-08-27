import { getPublicWsUrl } from '../config/urls';

type MessageHandler = (data: Record<string, unknown>) => void;
type ConnectionStateHandler = (connected: boolean) => void;
type ReconnectExhaustedHandler = () => void;

interface PendingRequest {
  resolve: (data: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}

interface DesiredSubscription {
  id: number;
  payload: Record<string, unknown>;
  handler: MessageHandler;
  subscriptionId: string | null;
  active: boolean;
}

/**
 * Lightweight WebSocket manager for the Deriv public WS API.
 * Handles connection, reconnection, request/response matching via req_id,
 * and subscription streaming.
 */
export class DerivWS {
  private ws: WebSocket | null = null;
  private reqIdCounter = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private subscriptionHandlers = new Map<string, MessageHandler>();
  private desiredSubscriptions = new Map<number, DesiredSubscription>();
  private globalHandlers: MessageHandler[] = [];
  private connectionStateHandlers: ConnectionStateHandler[] = [];
  private reconnectExhaustedHandlers: ReconnectExhaustedHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private url: string;
  private isConnecting = false;
  private manuallyDisconnected = false;

  constructor(url?: string) {
    this.url = url ?? getPublicWsUrl();
  }

  onConnectionStateChange(handler: ConnectionStateHandler): () => void {
    this.connectionStateHandlers.push(handler);
    return () => {
      this.connectionStateHandlers = this.connectionStateHandlers.filter((h) => h !== handler);
    };
  }

  onReconnectExhausted(handler: ReconnectExhaustedHandler): () => void {
    this.reconnectExhaustedHandlers.push(handler);
    return () => {
      this.reconnectExhaustedHandlers = this.reconnectExhaustedHandlers.filter((h) => h !== handler);
    };
  }

  private notifyConnectionState(connected: boolean): void {
    for (const handler of this.connectionStateHandlers) handler(connected);
  }

  updateUrl(url: string): void {
    this.url = url;
  }

  connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.isConnecting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    this.manuallyDisconnected = false;
    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startPing();
        this.notifyConnectionState(true);
        resolve();
        void this.restoreSubscriptions();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          this.handleMessage(data);
        } catch {
          // Ignore malformed WebSocket messages rather than breaking the connection.
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopPing();
        this.subscriptionHandlers.clear();
        for (const subscription of this.desiredSubscriptions.values()) {
          subscription.subscriptionId = null;
        }
        this.notifyConnectionState(false);
        if (!this.manuallyDisconnected) this.attemptReconnect();
      };
    });
  }

  send<T = Record<string, unknown>>(payload: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const reqId = ++this.reqIdCounter;
      const message = { ...payload, req_id: reqId };

      this.pendingRequests.set(reqId, {
        resolve: resolve as (data: Record<string, unknown>) => void,
        reject,
      });

      this.ws.send(JSON.stringify(message));
    });
  }

  subscribe(
    payload: Record<string, unknown>,
    handler: MessageHandler
  ): Promise<{ subscriptionId: string | null; unsubscribe: () => void }> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('WebSocket is not connected'));
    }

    const desiredId = ++this.reqIdCounter;
    const desired: DesiredSubscription = {
      id: desiredId,
      payload: { ...payload },
      handler,
      subscriptionId: null,
      active: true,
    };
    this.desiredSubscriptions.set(desiredId, desired);

    return new Promise((resolve, reject) => {
      this.sendSubscription(desired)
        .then((subscriptionId) => {
          if (!desired.active) {
            resolve({ subscriptionId: null, unsubscribe: () => {} });
            return;
          }
          resolve({
            subscriptionId,
            unsubscribe: () => this.removeSubscription(desiredId),
          });
        })
        .catch((error) => {
          this.desiredSubscriptions.delete(desiredId);
          reject(error);
        });
    });
  }

  private sendSubscription(desired: DesiredSubscription): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const reqId = ++this.reqIdCounter;
      this.pendingRequests.set(reqId, {
        resolve: (data) => {
          const subscriptionId = this.extractSubscriptionId(data);
          desired.subscriptionId = subscriptionId;
          if (subscriptionId) this.subscriptionHandlers.set(subscriptionId, desired.handler);
          desired.handler(data);
          resolve(subscriptionId);
        },
        reject,
      });

      this.ws.send(JSON.stringify({ ...desired.payload, subscribe: 1, req_id: reqId }));
    });
  }

  private async restoreSubscriptions(): Promise<void> {
    for (const desired of this.desiredSubscriptions.values()) {
      if (!desired.active || desired.subscriptionId) continue;
      try {
        await this.sendSubscription(desired);
      } catch {
        // Reconnection will retry active subscriptions on the next successful socket.
      }
    }
  }

  private removeSubscription(desiredId: number): void {
    const desired = this.desiredSubscriptions.get(desiredId);
    if (!desired) return;

    desired.active = false;
    this.desiredSubscriptions.delete(desiredId);
    if (desired.subscriptionId) {
      const subscriptionId = desired.subscriptionId;
      this.subscriptionHandlers.delete(subscriptionId);
      desired.subscriptionId = null;
      this.send({ forget: subscriptionId }).catch(() => {});
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.globalHandlers.push(handler);
    return () => {
      this.globalHandlers = this.globalHandlers.filter((h) => h !== handler);
    };
  }

  disconnect(): void {
    this.manuallyDisconnected = true;
    this.stopPing();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.subscriptionHandlers.clear();
    this.desiredSubscriptions.clear();
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: Record<string, unknown>): void {
    for (const handler of this.globalHandlers) handler(data);

    const reqId = data.req_id as number | undefined;

    if (data.error) {
      if (reqId && this.pendingRequests.has(reqId)) {
        const pending = this.pendingRequests.get(reqId)!;
        this.pendingRequests.delete(reqId);
        pending.reject(new Error((data.error as Record<string, string>).message));
      }
      return;
    }

    const subId = this.extractSubscriptionId(data);
    if (subId && this.subscriptionHandlers.has(subId)) {
      this.subscriptionHandlers.get(subId)!(data);
    }

    if (reqId && this.pendingRequests.has(reqId)) {
      const pending = this.pendingRequests.get(reqId)!;
      this.pendingRequests.delete(reqId);
      pending.resolve(data);
    }
  }

  private extractSubscriptionId(data: Record<string, unknown>): string | null {
    if (data.subscription && typeof data.subscription === 'object') {
      return (data.subscription as Record<string, string>).id ?? null;
    }
    if (data.tick && typeof data.tick === 'object') {
      return (data.tick as Record<string, string>).id ?? null;
    }
    return null;
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ ping: 1 }));
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      for (const handler of this.reconnectExhaustedHandlers) handler();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }
}
