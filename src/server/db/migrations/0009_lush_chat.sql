CREATE TABLE `google_tasks_links` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`google_task_id` text NOT NULL,
	`google_task_list_id` text NOT NULL,
	`local_updated_at_synced` integer NOT NULL,
	`remote_updated_at_synced` integer NOT NULL,
	`last_synced_at` integer NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_tasks_links_task_id_unique` ON `google_tasks_links` (`task_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `google_tasks_links_remote_unique` ON `google_tasks_links` (`google_task_list_id`,`google_task_id`);