/**
 * Socket.IO Event Types
 *
 * Defines all WebSocket events for real-time communication
 */

// Base event payloads
export interface OrderPayload {
  id: string;
  tabId: string;
  items: any[];
  status: string;
  createdAt: string;
}

export interface TabPayload {
  id: string;
  tableNumber: string | null;
  customerPhone: string | null;
  deliveryType: string;
  status: string;
  total: string;
  orders: OrderPayload[];
}

export interface PaymentPayload {
  id: string;
  paymentIntentId: string;
  tabId: string | null;
  amount: number;
  status: string;
  paymentMethod: string | null;
}

// Client → Server Events
export interface ClientToServerEvents {
  // Authentication
  authenticate: (token: string) => void;

  // Subscription management
  subscribe: (events: string[]) => void;
  unsubscribe: (events: string[]) => void;

  // Heartbeat
  ping: () => void;
}

// Server → Client Events
export interface ServerToClientEvents {
  // Connection events
  authenticated: (data: { userId: string; tenantSchema: string }) => void;
  error: (message: string) => void;
  pong: () => void;

  // Order events
  'order:created': (order: OrderPayload) => void;
  'order:updated': (order: OrderPayload) => void;
  'order:delivered': (data: { orderId: string; deliveredAt: string }) => void;

  // Tab events
  'tab:created': (tab: TabPayload) => void;
  'tab:updated': (tab: TabPayload) => void;
  'tab:closed': (data: { tabId: string; closedAt: string; paymentMethod: string }) => void;

  // Payment events
  'payment:success': (payment: PaymentPayload) => void;
  'payment:failed': (data: { paymentIntentId: string; error: string }) => void;
  'payment:refunded': (data: { paymentId: string; amount: number }) => void;
}

// Socket data stored in socket.data
export interface SocketData {
  userId: string;
  userEmail: string;
  tenantSchema: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  authenticated: boolean;
  subscribedEvents: string[];
}

// Event names (for type safety)
export const SocketEvents = {
  // Client → Server
  CLIENT: {
    AUTHENTICATE: 'authenticate',
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    PING: 'ping',
  },

  // Server → Client
  SERVER: {
    AUTHENTICATED: 'authenticated',
    ERROR: 'error',
    PONG: 'pong',

    // Orders
    ORDER_CREATED: 'order:created',
    ORDER_UPDATED: 'order:updated',
    ORDER_DELIVERED: 'order:delivered',

    // Tabs
    TAB_CREATED: 'tab:created',
    TAB_UPDATED: 'tab:updated',
    TAB_CLOSED: 'tab:closed',

    // Payments
    PAYMENT_SUCCESS: 'payment:success',
    PAYMENT_FAILED: 'payment:failed',
    PAYMENT_REFUNDED: 'payment:refunded',
  },
} as const;

// Helper type for event emission
export type EmitEvent<T = any> = {
  tenantSchema: string;
  event: keyof ServerToClientEvents;
  data: T;
};
