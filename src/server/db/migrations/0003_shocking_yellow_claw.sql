CREATE TABLE `watchlist_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`symbol` text NOT NULL,
	`name` text NOT NULL,
	`target_price` real,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer
);
