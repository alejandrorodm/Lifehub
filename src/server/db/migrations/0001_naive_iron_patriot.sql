CREATE TABLE `google_calendar_connection` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_expires_at` integer NOT NULL,
	`calendar_id` text DEFAULT 'primary' NOT NULL,
	`scope` text NOT NULL,
	`sync_token` text,
	`connected_at` integer NOT NULL,
	`last_synced_at` integer
);
--> statement-breakpoint
CREATE TABLE `google_event_links` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`google_event_id` text NOT NULL,
	`google_calendar_id` text NOT NULL,
	`local_updated_at_synced` integer NOT NULL,
	`remote_updated_at_synced` integer NOT NULL,
	`last_synced_at` integer NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_event_links_event_id_unique` ON `google_event_links` (`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `google_event_links_google_event_unique` ON `google_event_links` (`google_calendar_id`,`google_event_id`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);