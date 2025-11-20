"use strict";
/**
 * Socket.IO Event Types
 *
 * Defines all WebSocket events for real-time communication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketEvents = void 0;
// Event names (for type safety)
exports.SocketEvents = {
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
};
//# sourceMappingURL=socket.js.map