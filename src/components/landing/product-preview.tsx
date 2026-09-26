import { statusLabels, statusStyles, type PostStatus } from "@/features/feedback/statuses";

const ideas: { title: string; votes: number; status: PostStatus; comments: number; voted?: boolean }[] = [
  { title: "Dark mode", votes: 58, status: "complete", comments: 2 },
  { title: "Two-way Google Calendar sync", votes: 47, status: "in_progress", comments: 2, voted: true },
  { title: "Outlook / Microsoft 365 integration", votes: 31, status: "planned", comments: 0 },
  { title: "Automatically protect focus time", votes: 25, status: "under_review", comments: 0 },
];

/** A static, decorative rendering of a board — the real one is one click away at /b/orbit. */
export function ProductPreview() {
  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-accent/25 via-accent/5 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/10">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 truncate rounded-md bg-surface-2 px-3 py-1 font-mono text-xs text-muted">echoboard.app/b/orbit</span>
        </div>
        <div className="flex items-center gap-2.5 border-b border-border px-5 py-3">
          <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-semibold text-accent-fg">O</span>
          <span className="text-sm font-semibold">Orbit</span>
          <span className="ml-auto flex gap-4 text-xs">
            <span className="font-medium">Feedback</span>
            <span className="text-muted">Roadmap</span>
          </span>
        </div>
        <ul className="divide-y divide-border">
          {ideas.map((idea) => (
            <li key={idea.title} className="flex items-center gap-4 px-5 py-3.5">
              <span
                className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-semibold tabular-nums ${
                  idea.voted ? "border-accent bg-accent-soft text-accent" : "border-border"
                }`}
              >
                <svg viewBox="0 0 16 16" className="size-3" aria-hidden>
                  <path d="M8 3.5 13 10H3z" fill="currentColor" />
                </svg>
                {idea.votes}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{idea.title}</span>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyles[idea.status]}`}>
                  {statusLabels[idea.status]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -right-3 -bottom-4 flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-lg shadow-accent/30 sm:-right-5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 5h16v11H9l-5 4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        Feedback
      </div>
    </div>
  );
}
