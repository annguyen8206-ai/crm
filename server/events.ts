import { EventEmitter } from 'node:events';

/**
 * Process-wide change bus. The SSE endpoint (/api/stream) forwards every event
 * to connected CRM clients so the UI updates in real time.
 */
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export type ChangeEvent =
  | { type: 'store'; path: string; method: string }
  | { type: 'message'; conversationId: string; message: unknown }
  | { type: 'conversation'; conversation: unknown }
  | { type: 'payment'; invoiceCode: string }
  | { type: 'incoming-call'; call: unknown; patient: unknown }
  | { type: 'reminder'; appointmentId: string; kind: '24h' | '2h' };

export function emitChange(evt: ChangeEvent): void {
  bus.emit('change', { ...evt, at: new Date().toISOString() });
}
