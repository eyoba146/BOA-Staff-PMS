import { env } from '@/config/env';
import { tokenStore } from './http/apiClient';

type RealtimeHandler<T = any> = (data: T) => void;

class RealtimeService {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<RealtimeHandler>> = new Map();
  private reconnectTimeout: any = null;
  private isConnecting = false;

  public connect() {
    if (env.useMockApi) return;
    if (this.eventSource || this.isConnecting) return;

    const token = tokenStore.get();
    if (!token) return;

    this.isConnecting = true;
    const streamUrl = `${env.apiBaseUrl.replace(/\/$/, '')}/realtime/stream?token=${encodeURIComponent(token)}`;

    try {
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this.isConnecting = false;
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        this.disconnect();
        // Exponential reconnect
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
          }, 3000);
        }
      };

      // Register listener bindings for known event types
      const registeredTypes = [
        'connected',
        'chat_message',
        'chat_message_updated',
        'chat_message_deleted',
        'announcement_created',
        'feedback_created',
        'nav_counts_invalidated',
      ];

      for (const eventType of registeredTypes) {
        this.eventSource.addEventListener(eventType, (event: MessageEvent) => {
          try {
            const data = event.data ? JSON.parse(event.data) : null;
            this.dispatch(eventType, data);

            // If an event alters unread counters, emit local count invalidation & cache flush
            if (['chat_message', 'announcement_created', 'feedback_created', 'nav_counts_invalidated'].includes(eventType)) {
              window.dispatchEvent(new CustomEvent('pms:nav-counts-invalidate'));
              window.dispatchEvent(new CustomEvent('pms:cache-invalidate'));
            }
          } catch {
            // ignore malformed event payloads
          }
        });
      }
    } catch {
      this.isConnecting = false;
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnecting = false;
  }

  public on<T = any>(event: string, handler: RealtimeHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Auto-connect if not connected yet
    if (!this.eventSource && !this.isConnecting) {
      this.connect();
    }

    // Return cleanup unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  public dispatch(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (e) {
          console.error(`Error in realtime handler for ${event}:`, e);
        }
      }
    }
  }
}

export const realtimeService = new RealtimeService();
