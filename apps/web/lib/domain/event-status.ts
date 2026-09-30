import type { MessageKey } from '../i18n/index.ts';
import type { EventLifecycleStatus } from './types.ts';

export const eventLifecycleMessageKeys: Record<EventLifecycleStatus, MessageKey> = {
  scheduled: 'eventStatus.scheduled',
  offsale: 'eventStatus.offsale',
  postponed: 'eventStatus.postponed',
  rescheduled: 'eventStatus.rescheduled',
  cancelled: 'eventStatus.cancelled',
  deleted: 'eventStatus.deleted',
};
