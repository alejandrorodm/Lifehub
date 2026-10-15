import { cn } from "@client/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-bg-subtle", className)}
      role="presentation"
      aria-hidden="true"
    />
  );
}
