/**
 * Socket.IO Event Types
 *
 * Defines all WebSocket events for real-time communication
 */
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
export interface ClientToServerEvents {
    authenticate: (token: string) => void;
    subscribe: (events: string[]) => void;
    unsubscribe: (events: string[]) => void;
    ping: () => void;
}
export interface ServerToClientEvents {
    authenticated: (data: {
        userId: string;
        tenantSchema: string;
    }) => void;
    error: (message: string) => void;
    pong: () => void;
    'order:created': (order: OrderPayload) => void;
    'order:updated': (order: OrderPayload) => void;
    'order:delivered': (data: {
        orderId: string;
        deliveredAt: string;
    }) => void;
    'tab:created': (tab: TabPayload) => void;
    'tab:updated': (tab: TabPayload) => void;
    'tab:closed': (data: {
        tabId: string;
        closedAt: string;
        paymentMethod: string;
    }) => void;
    'payment:success': (payment: PaymentPayload) => void;
    'payment:failed': (data: {
        paymentIntentId: string;
        error: string;
    }) => void;
    'payment:refunded': (data: {
        paymentId: string;
        amount: number;
    }) => void;
}
export interface SocketData {
    userId: string;
    userEmail: string;
    tenantSchema: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
    authenticated: boolean;
    subscribedEvents: string[];
}
export declare const SocketEvents: {
    readonly CLIENT: {
        readonly AUTHENTICATE: "authenticate";
        readonly SUBSCRIBE: "subscribe";
        readonly UNSUBSCRIBE: "unsubscribe";
        readonly PING: "ping";
    };
    readonly SERVER: {
        readonly AUTHENTICATED: "authenticated";
        readonly ERROR: "error";
        readonly PONG: "pong";
        readonly ORDER_CREATED: "order:created";
        readonly ORDER_UPDATED: "order:updated";
        readonly ORDER_DELIVERED: "order:delivered";
        readonly TAB_CREATED: "tab:created";
        readonly TAB_UPDATED: "tab:updated";
        readonly TAB_CLOSED: "tab:closed";
        readonly PAYMENT_SUCCESS: "payment:success";
        readonly PAYMENT_FAILED: "payment:failed";
        readonly PAYMENT_REFUNDED: "payment:refunded";
    };
};
export type EmitEvent<T = any> = {
    tenantSchema: string;
    event: keyof ServerToClientEvents;
    data: T;
};
//# sourceMappingURL=socket.d.ts.map