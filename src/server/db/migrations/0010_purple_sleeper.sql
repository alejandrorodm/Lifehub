CREATE TABLE `github_connection` (
	`user_id` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`login` text NOT NULL,
	`scope` text NOT NULL,
	`connected_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
