import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import type { Db } from "@/db/client";
import { comment, member, organization, post, user, vote } from "@/db/schema";
import { createBoard } from "@/features/feedback/service";
import type { PostStatus } from "@/features/feedback/statuses";
import { demoSlug } from "./constants";

/*
 * Demo workspace for the public showcase at /b/orbit — a fictional team-calendar product.
 * Every seeded account lives on the reserved example.com domain and has no password,
 * so nobody can sign in as them. Re-running the seed resets the demo to this exact state.
 */

export { demoSlug };
const demoDomain = "orbit.example.com";

const team = [
  { name: "Maya Chen", role: "owner" },
  { name: "Tomás Rivera", role: "admin" },
] as const;

const voterNames = [
  "Aisha Khan", "Ben Carter", "Chloe Martin", "Daniel Novak", "Elena Popescu", "Felix Wagner", "Grace Kim", "Hugo Laurent",
  "Ines Ferreira", "Jonas Berg", "Kira Ivanova", "Liam O'Brien", "Mina Sato", "Noah Fischer", "Olivia Rossi", "Pablo Ortega",
  "Quinn Taylor", "Rosa Delgado", "Sam Lee", "Tara Singh", "Umar Farouk", "Vera Horvat", "Will Turner", "Xenia Kowalski",
  "Yusuf Demir", "Zoe Adams", "Andrei Ionescu", "Bianca Stoica", "Carlos Mendes", "Dana Levi", "Erik Johansson", "Fatima Zahra",
  "Gabriel Dubois", "Hanna Nowak", "Ivan Petrov", "Julia Schmidt", "Kenji Watanabe", "Lucia Moreno", "Marco Bianchi", "Nadia Haddad",
  "Oscar Lindqvist", "Priya Nair", "Rafael Costa", "Sofia Esposito", "Theo Martin", "Ulla Virtanen", "Victor Hugo Silva", "Wen Zhao",
  "Yara Nasser", "Zara Ahmed", "Alex Morgan", "Bruno Keller", "Clara Jensen", "Dmitri Volkov", "Eva Novotná", "Finn Murphy",
  "Gia Tran", "Hector Ruiz", "Iris Bakker", "Jae-won Park",
];

type DemoPost = {
  title: string;
  body: string;
  status: PostStatus;
  votes: number;
  daysAgo: number;
  comments?: { by: "team" | number; text: string; daysAgo: number }[];
  duplicateOf?: string;
};

const demoPosts: DemoPost[] = [
  {
    title: "Dark mode",
    body: "I plan my week late at night and the bright white calendar is painful. A dark theme (ideally following the OS setting) would be great.",
    status: "complete",
    votes: 58,
    daysAgo: 88,
    comments: [
      { by: 3, text: "Yes please, especially on the desktop app.", daysAgo: 80 },
      { by: "team", text: "Shipped in 2.4 🌙 It follows your system setting by default, and you can override it in Settings → Appearance.", daysAgo: 12 },
    ],
  },
  {
    title: "Two-way Google Calendar sync",
    body: "Right now events only import from Google. I'd like changes in Orbit to show up in Google Calendar too, so my phone stays in sync.",
    status: "in_progress",
    votes: 47,
    daysAgo: 75,
    comments: [
      { by: 8, text: "This is the one thing stopping our whole team from switching.", daysAgo: 60 },
      { by: "team", text: "We're building this now. Beta invites go out to voters first — keep an eye on your inbox.", daysAgo: 6 },
    ],
  },
  {
    title: "Recurring events with custom rules",
    body: "Things like \"every second Tuesday\" or \"last Friday of the month\". Currently only daily/weekly/monthly are possible.",
    status: "in_progress",
    votes: 34,
    daysAgo: 64,
    comments: [{ by: "team", text: "Rules engine is done; now working on the editor UI.", daysAgo: 9 }],
  },
  {
    title: "Outlook / Microsoft 365 integration",
    body: "Half of our clients live in Outlook. Being able to see their free/busy slots would save a lot of back-and-forth.",
    status: "planned",
    votes: 31,
    daysAgo: 70,
  },
  {
    title: "Slack reminders before meetings",
    body: "A DM a few minutes before a meeting starts, with the video link, would be perfect.",
    status: "planned",
    votes: 28,
    daysAgo: 41,
    comments: [{ by: 14, text: "Would love a daily agenda message in the morning too.", daysAgo: 30 }],
  },
  {
    title: "Automatically protect focus time",
    body: "Let me set a weekly goal (e.g. 10 hours of deep work) and have Orbit block the best free slots for it.",
    status: "under_review",
    votes: 25,
    daysAgo: 33,
  },
  {
    title: "Show other people's time zones when scheduling",
    body: "When I pick a time, show what it is for each attendee so I don't book someone at 3am.",
    status: "under_review",
    votes: 22,
    daysAgo: 29,
    comments: [{ by: "team", text: "Great point — we're looking at showing this inline in the time picker.", daysAgo: 20 }],
  },
  {
    title: "Keyboard shortcuts",
    body: "C to create, T for today, arrow keys to move between weeks.",
    status: "complete",
    votes: 19,
    daysAgo: 95,
    comments: [{ by: "team", text: "Live now — press ? anywhere to see the full list.", daysAgo: 40 }],
  },
  {
    title: "Offline mode for the mobile app",
    body: "On flights and the subway the app shows a blank screen. Read-only offline access would already help a lot.",
    status: "open",
    votes: 16,
    daysAgo: 22,
  },
  {
    title: "Estimate the cost of a meeting",
    body: "Optional: show an approximate cost based on the number of attendees. Great nudge to keep meetings short.",
    status: "open",
    votes: 11,
    daysAgo: 15,
  },
  {
    title: "Colour-code events by project",
    body: "Assign a colour per project/client so the week view is scannable at a glance.",
    status: "open",
    votes: 9,
    daysAgo: 8,
  },
  {
    title: "Export a month to PDF",
    body: "For printing and sharing with people who don't use Orbit.",
    status: "open",
    votes: 5,
    daysAgo: 4,
  },
  {
    title: "Night theme please",
    body: "Everything is so bright in the evening!",
    status: "closed",
    votes: 6,
    daysAgo: 50,
    duplicateOf: "Dark mode",
  },
];

const email = (name: string) => `${name.toLowerCase().normalize("NFKD").replace(/[^a-z]+/g, ".")}@${demoDomain}`;
const daysAgo = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);

/** Removes the demo workspace and every demo account. Touches nothing else. */
export async function removeDemo(db: Db) {
  await db.delete(organization).where(eq(organization.slug, demoSlug)); // cascades boards, posts, votes, comments
  await db.delete(user).where(like(user.email, `%@${demoDomain}`));
}

export async function seedDemo(db: Db) {
  await removeDemo(db);

  const staff = team.map((person) => ({ id: randomUUID(), name: person.name, role: person.role }));
  const voters = voterNames.map((name) => ({ id: randomUUID(), name }));
  await db.insert(user).values(
    [...staff, ...voters].map((person) => ({
      id: person.id,
      name: person.name,
      email: email(person.name),
      emailVerified: true,
      createdAt: daysAgo(120),
    })),
  );

  const organizationId = randomUUID();
  await db.insert(organization).values({ id: organizationId, name: "Orbit", slug: demoSlug, createdAt: daysAgo(120) });
  await db.insert(member).values(
    staff.map((person) => ({ id: randomUUID(), organizationId, userId: person.id, role: person.role, createdAt: daysAgo(120) })),
  );
  const board = await createBoard(db, {
    organizationId,
    name: "Feature requests",
    slug: "feature-requests",
    description: "What should we build next for Orbit? Vote on ideas or suggest your own.",
  });
  if (!board) throw new Error("Could not create the demo board.");

  const ids = new Map<string, string>();
  for (const [index, item] of demoPosts.entries()) {
    const author = voters[(index * 7) % voters.length];
    const [created] = await db
      .insert(post)
      .values({
        boardId: board.id,
        authorId: author.id,
        title: item.title,
        body: item.body,
        status: item.status,
        createdAt: daysAgo(item.daysAgo),
      })
      .returning({ id: post.id });
    ids.set(item.title, created.id);

    // The author votes first, then a deterministic slice of voters — stable demo numbers.
    const supporters = [author, ...voters.filter((v) => v.id !== author.id)].slice(0, item.votes);
    await db.insert(vote).values(
      supporters.map((supporter, i) => ({ postId: created.id, userId: supporter.id, createdAt: daysAgo(item.daysAgo, -i) })),
    );

    for (const note of item.comments ?? []) {
      await db.insert(comment).values({
        postId: created.id,
        authorId: note.by === "team" ? staff[0].id : voters[note.by].id,
        body: note.text,
        createdAt: daysAgo(note.daysAgo),
      });
    }
  }

  for (const item of demoPosts) {
    if (!item.duplicateOf) continue;
    await db
      .update(post)
      .set({ mergedIntoId: ids.get(item.duplicateOf) })
      .where(eq(post.id, ids.get(item.title)!));
  }

  return { organizationId, boardId: board.id, posts: demoPosts.length, users: staff.length + voters.length };
}
