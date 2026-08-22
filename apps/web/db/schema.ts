import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const artists = sqliteTable('artists', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  koreanName: text('korean_name'),
  agency: text('agency').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const tours = sqliteTable('tours', {
  id: text('id').primaryKey(),
  artistId: text('artist_id')
    .notNull()
    .references(() => artists.id),
  name: text('name').notNull(),
  status: text('status', { enum: ['announced', 'active', 'completed', 'cancelled'] })
    .notNull()
    .default('announced'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const venues = sqliteTable(
  'venues',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    city: text('city').notNull(),
    market: text('market').notNull(),
    timezone: text('timezone').notNull(),
    latitude: integer('latitude_e6').notNull(),
    longitude: integer('longitude_e6').notNull(),
  },
  (table) => [index('idx_venues_market_city').on(table.market, table.city)],
);

export const performances = sqliteTable(
  'performances',
  {
    id: text('id').primaryKey(),
    tourId: text('tour_id')
      .notNull()
      .references(() => tours.id),
    venueId: text('venue_id')
      .notNull()
      .references(() => venues.id),
    startsAt: text('starts_at').notNull(),
    timezone: text('timezone').notNull(),
    market: text('market').notNull(),
    status: text('status', {
      enum: ['announced', 'on_sale', 'sold_out', 'completed', 'postponed', 'cancelled'],
    })
      .notNull()
      .default('announced'),
    officialSellerHost: text('official_seller_host'),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_performances_market_start').on(table.market, table.startsAt)],
);

export const milestones = sqliteTable(
  'milestones',
  {
    id: text('id').primaryKey(),
    performanceId: text('performance_id')
      .notNull()
      .references(() => performances.id),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    startsAt: text('starts_at').notNull(),
    endsAt: text('ends_at'),
    timezone: text('timezone').notNull(),
    version: integer('version').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_milestones_performance_start').on(table.performanceId, table.startsAt),
    index('idx_milestones_end').on(table.endsAt),
  ],
);

export const sourceEvidence = sqliteTable(
  'source_evidence',
  {
    id: text('id').primaryKey(),
    milestoneId: text('milestone_id')
      .notNull()
      .references(() => milestones.id),
    sourceId: text('source_id').notNull(),
    name: text('name').notNull(),
    url: text('url').notNull(),
    host: text('host').notNull(),
    confidence: text('confidence', {
      enum: ['official', 'verified', 'reported', 'unverified'],
    }).notNull(),
    checkedAt: integer('checked_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('idx_source_evidence_milestone').on(table.milestoneId),
    index('idx_source_evidence_host').on(table.host),
  ],
);

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  homeTimezone: text('home_timezone').notNull().default('Asia/Singapore'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const savedJourneys = sqliteTable(
  'saved_journeys',
  {
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId),
    journeyId: text('journey_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.journeyId] }),
    index('idx_saved_journeys_user').on(table.userId, table.createdAt),
  ],
);

export const planMilestoneStates = sqliteTable(
  'plan_milestone_states',
  {
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId),
    journeyId: text('journey_id').notNull(),
    milestoneId: text('milestone_id').notNull(),
    state: text('state', { enum: ['todo', 'completed', 'skipped'] })
      .notNull()
      .default('todo'),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.journeyId, table.milestoneId] }),
    index('idx_plan_states_user_journey').on(table.userId, table.journeyId),
  ],
);

export const attendances = sqliteTable(
  'attendances',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId),
    artistId: text('artist_id').notNull(),
    artistName: text('artist_name').notNull(),
    venueName: text('venue_name').notNull(),
    city: text('city').notNull(),
    market: text('market').notNull(),
    attendedAt: text('attended_at').notNull(),
    travelDistanceKm: integer('travel_distance_km').notNull().default(0),
    verification: text('verification', {
      enum: ['self_attested', 'ticket_import', 'location_confirmed'],
    })
      .notNull()
      .default('self_attested'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_attendances_user_date').on(table.userId, table.attendedAt)],
);

export const sourceSubmissions = sqliteTable(
  'source_submissions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId),
    url: text('url').notNull(),
    host: text('host').notNull(),
    status: text('status', { enum: ['pending', 'verified', 'rejected'] })
      .notNull()
      .default('pending'),
    submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('idx_source_submissions_status_date').on(table.status, table.submittedAt)],
);
