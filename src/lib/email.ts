export type Email = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Sends a transactional email through Resend when RESEND_API_KEY is set.
 * Without a key (local development, tests) the email is printed to the console instead.
 */
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`\n📧 [email] to=${email.to}\n   subject: ${email.subject}\n   ${email.text.replace(/\n/g, "\n   ")}\n`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Echoboard <onboarding@resend.dev>",
      to: email.to,
      subject: email.subject,
      text: email.text,
    }),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the email (${response.status}): ${await response.text()}`);
  }
}
