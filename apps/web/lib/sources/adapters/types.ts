import type {
  ConnectorHealth,
  DiscoveredEvent,
  DiscoveryQuery,
} from '@/lib/domain/types';

export interface EventSourceAdapter {
  readonly id: string;
  readonly name: string;
  health(): ConnectorHealth;
  discover(query: DiscoveryQuery): Promise<DiscoveredEvent[]>;
}
