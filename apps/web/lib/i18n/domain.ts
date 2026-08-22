import type {
  MarketCode,
  MilestoneState,
  MilestoneType,
  ProviderStatus,
  SourceChannel,
} from '@/lib/domain/types';
import type { MessageKey } from './types';

export function milestoneTitleKey(type: MilestoneType): MessageKey {
  return `milestone.${type}.title` as MessageKey;
}

export function milestoneDescriptionKey(type: MilestoneType): MessageKey {
  return `milestone.${type}.description` as MessageKey;
}

export function milestoneStateKey(state: MilestoneState): MessageKey {
  return `milestoneState.${state}` as MessageKey;
}

export function marketKey(market: MarketCode | 'ALL'): MessageKey {
  return `market.${market}` as MessageKey;
}

const cityKeys: Record<string, MessageKey> = {
  Singapore: 'city.Singapore',
  'Hong Kong': 'city.Hong Kong',
  Taipei: 'city.Taipei',
  Bangkok: 'city.Bangkok',
  Seoul: 'city.Seoul',
};

export function cityKey(city: string): MessageKey | undefined {
  return cityKeys[city];
}

export function sourceCategoryKey(category: SourceChannel['category']): MessageKey {
  return `category.${category}` as MessageKey;
}

export function sourceCapabilityKey(
  capability: SourceChannel['capabilities'][number],
): MessageKey {
  return `capability.${capability}` as MessageKey;
}

export function sourceStatusKey(status: ProviderStatus): MessageKey {
  return `sourceStatus.${status}` as MessageKey;
}
