import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db, type Db } from "@/db/client";
import * as schema from "@/db/schema";
import { createBoard } from "@/features/feedback/service";
import { sendEmail } from "@/lib/email";

export const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/** Built from a database handle so tests can run the real auth stack against an in-memory Postgres. */
export function createAuth(database: Db, options: { inNextRuntime: boolean }) {
  return betterAuth({
    baseURL: appUrl,
    database: drizzleAdapter(database, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    plugins: [
      organization({
        creatorRole: "owner",
        invitationExpiresIn: 60 * 60 * 24 * 7,
        organizationHooks: {
          // Every workspace starts with a board, so its public page is never empty-handed.
          async afterCreateOrganization({ organization }) {
            await createBoard(database, {
              organizationId: organization.id,
              name: "Feature requests",
              slug: "feature-requests",
              description: "Tell us what would make the product better for you.",
            });
          },
        },
        async sendInvitationEmail({ id, email, organization, inviter }) {
          await sendEmail({
            to: email,
            subject: `${inviter.user.name} invited you to ${organization.name} on Echoboard`,
            text: `Join ${organization.name} on Echoboard:\n${appUrl}/invite/${id}`,
          });
        },
      }),
      // Must stay last: lets server actions set auth cookies. Only works inside a Next.js request.
      ...(options.inNextRuntime ? [nextCookies()] : []),
    ],
  });
}

export const auth = createAuth(db, { inNextRuntime: true });

export type Auth = ReturnType<typeof createAuth>;
export type Session = typeof auth.$Infer.Session;
