import type { DiscoveredEvent } from '../../domain/types.ts';

// Preserve earlier pages when a later page fails or a provider truncates coverage.
export class PartialDiscoveryError extends Error {
  events: DiscoveredEvent[];
  constructor(message: string, events: DiscoveredEvent[]) {
    super(message);
    this.events = events;
  }
}
