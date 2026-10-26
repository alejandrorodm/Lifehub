CREATE TABLE `google_task_links` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`google_event_id` text NOT NULL,
	`google_calendar_id` text NOT NULL,
	`local_updated_at_synced` integer NOT NULL,
	`remote_updated_at_synced` integer NOT NULL,
	`last_synced_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_task_links_task_id_unique` ON `google_task_links` (`task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `google_task_links_google_event_unique` ON `google_task_links` (`google_calendar_id`,`google_event_id`);