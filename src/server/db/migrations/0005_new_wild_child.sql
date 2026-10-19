DROP INDEX `tags_name_unique`;--> statement-breakpoint
ALTER TABLE `tags` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_user_id_name_unique` ON `tags` (`user_id`,`name`);--> statement-breakpoint
DROP INDEX `notes_journal_date_unique`;--> statement-breakpoint
ALTER TABLE `notes` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
CREATE UNIQUE INDEX `notes_journal_date_unique` ON `notes` (`user_id`,`journal_date`) WHERE "notes"."kind" = 'journal' and "notes"."deleted_at" is null;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_settings` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `key`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_settings`("user_id", "key", "value", "updated_at") SELECT '00000000-0000-7000-8000-000000000001', "key", "value", "updated_at" FROM `settings`;--> statement-breakpoint
DROP TABLE `settings`;--> statement-breakpoint
ALTER TABLE `__new_settings` RENAME TO `settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_google_calendar_connection` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_expires_at` integer NOT NULL,
	`calendar_id` text DEFAULT 'primary' NOT NULL,
	`scope` text NOT NULL,
	`sync_token` text,
	`connected_at` integer NOT NULL,
	`last_synced_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_google_calendar_connection`("id", "user_id", "access_token", "refresh_token", "token_expires_at", "calendar_id", "scope", "sync_token", "connected_at", "last_synced_at") SELECT "id", '00000000-0000-7000-8000-000000000001', "access_token", "refresh_token", "token_expires_at", "calendar_id", "scope", "sync_token", "connected_at", "last_synced_at" FROM `google_calendar_connection`;--> statement-breakpoint
DROP TABLE `google_calendar_connection`;--> statement-breakpoint
ALTER TABLE `__new_google_calendar_connection` RENAME TO `google_calendar_connection`;--> statement-breakpoint
CREATE UNIQUE INDEX `google_calendar_connection_user_id_unique` ON `google_calendar_connection` (`user_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `finance_assets` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `finance_entries` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `finance_goals` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `habits` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `routines` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `inbox_items` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `projects` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `reminders` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);--> statement-breakpoint
ALTER TABLE `watchlist_assets` ADD `user_id` text DEFAULT '00000000-0000-7000-8000-000000000001' NOT NULL REFERENCES users(id);
