CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`korean_name` text,
	`agency` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attendances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`artist_id` text NOT NULL,
	`artist_name` text NOT NULL,
	`venue_name` text NOT NULL,
	`city` text NOT NULL,
	`market` text NOT NULL,
	`attended_at` text NOT NULL,
	`travel_distance_km` integer DEFAULT 0 NOT NULL,
	`verification` text DEFAULT 'self_attested' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_attendances_user_date` ON `attendances` (`user_id`,`attended_at`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`performance_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text,
	`timezone` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`performance_id`) REFERENCES `performances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_milestones_performance_start` ON `milestones` (`performance_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `idx_milestones_end` ON `milestones` (`ends_at`);--> statement-breakpoint
CREATE TABLE `performances` (
	`id` text PRIMARY KEY NOT NULL,
	`tour_id` text NOT NULL,
	`venue_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`timezone` text NOT NULL,
	`market` text NOT NULL,
	`status` text DEFAULT 'announced' NOT NULL,
	`official_seller_host` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`tour_id`) REFERENCES `tours`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_performances_market_start` ON `performances` (`market`,`starts_at`);--> statement-breakpoint
CREATE TABLE `plan_milestone_states` (
	`user_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`milestone_id` text NOT NULL,
	`state` text DEFAULT 'todo' NOT NULL,
	`completed_at` integer,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `journey_id`, `milestone_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_plan_states_user_journey` ON `plan_milestone_states` (`user_id`,`journey_id`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`home_timezone` text DEFAULT 'Asia/Singapore' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saved_journeys` (
	`user_id` text NOT NULL,
	`journey_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `journey_id`),
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_saved_journeys_user` ON `saved_journeys` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `source_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`milestone_id` text NOT NULL,
	`source_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`host` text NOT NULL,
	`confidence` text NOT NULL,
	`checked_at` integer NOT NULL,
	FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_source_evidence_milestone` ON `source_evidence` (`milestone_id`);--> statement-breakpoint
CREATE INDEX `idx_source_evidence_host` ON `source_evidence` (`host`);--> statement-breakpoint
CREATE TABLE `source_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`url` text NOT NULL,
	`host` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `profiles`(`user_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_source_submissions_status_date` ON `source_submissions` (`status`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `tours` (
	`id` text PRIMARY KEY NOT NULL,
	`artist_id` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'announced' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`artist_id`) REFERENCES `artists`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`market` text NOT NULL,
	`timezone` text NOT NULL,
	`latitude_e6` integer NOT NULL,
	`longitude_e6` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_venues_market_city` ON `venues` (`market`,`city`);