// Plain data with no imports: safe to use from client components and from the database schema.
export const postStatuses = ["open", "under_review", "planned", "in_progress", "complete", "closed"] as const;
export type PostStatus = (typeof postStatuses)[number];

export const statusLabels: Record<PostStatus, string> = {
  open: "Open",
  under_review: "Under review",
  planned: "Planned",
  in_progress: "In progress",
  complete: "Complete",
  closed: "Closed",
};

export const statusStyles: Record<PostStatus, string> = {
  open: "bg-surface-2 text-muted",
  under_review: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  planned: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  in_progress: "bg-accent-soft text-accent",
  complete: "bg-success-soft text-success",
  closed: "bg-surface-2 text-muted line-through decoration-muted/50",
};
