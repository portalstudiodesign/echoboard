import { sendEmail, type Email } from "@/lib/email";
import { statusLabels, type PostStatus } from "./statuses";

type Recipient = { email: string; name: string };

const footer = (orgName: string) =>
  `\n\n—\nYou're getting this because you voted on the ${orgName} feedback board.`;

export function statusChangedEmails(
  recipients: Recipient[],
  input: { orgName: string; postTitle: string; status: PostStatus; url: string },
): Email[] {
  const label = statusLabels[input.status];
  const headline =
    input.status === "complete"
      ? `Shipped: "${input.postTitle}" is now live 🎉`
      : `"${input.postTitle}" is now ${label.toLowerCase()}`;
  return recipients.map((recipient) => ({
    to: recipient.email,
    subject: `[${input.orgName}] ${headline}`,
    text:
      `Hi ${recipient.name.split(" ")[0]},\n\n` +
      `An idea you voted for on the ${input.orgName} board moved to "${label}".\n\n` +
      `${input.postTitle}\n${input.url}` +
      footer(input.orgName),
  }));
}

export function mergedEmails(
  recipients: Recipient[],
  input: { orgName: string; duplicateTitle: string; targetTitle: string; url: string },
): Email[] {
  return recipients.map((recipient) => ({
    to: recipient.email,
    subject: `[${input.orgName}] Your vote moved to "${input.targetTitle}"`,
    text:
      `Hi ${recipient.name.split(" ")[0]},\n\n` +
      `The ${input.orgName} team merged "${input.duplicateTitle}" into a matching idea, ` +
      `so your vote now counts there:\n\n${input.targetTitle}\n${input.url}` +
      footer(input.orgName),
  }));
}

/**
 * Sends each email independently: one bad address must not stop the rest.
 * Failures are logged, not thrown — this runs after the response has already been sent.
 */
export async function deliverAll(emails: Email[], concurrency = 5): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += concurrency) {
    const results = await Promise.allSettled(emails.slice(i, i + concurrency).map(sendEmail));
    for (const result of results) {
      if (result.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("[notifications] email failed:", result.reason);
      }
    }
  }
  return { sent, failed };
}
