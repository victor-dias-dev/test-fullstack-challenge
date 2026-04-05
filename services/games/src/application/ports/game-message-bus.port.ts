/**
 * Outbound/inbound messaging — implemented by infrastructure (e.g. RabbitMQ).
 * Application layer depends only on this port, not on concrete brokers.
 */
export interface GameMessageBus {
  publish(routingKey: string, payload: Record<string, unknown>): Promise<void>;
  subscribe(
    routingKey: string,
    handler: (msg: Record<string, unknown>) => Promise<void>,
  ): void;
}

export const GAME_MESSAGE_BUS = Symbol("GAME_MESSAGE_BUS");
