import { Resend } from "resend";

export interface SendEmailParams {
  to: string;
  from?: string;
  replyTo: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Email service not configured. Please add RESEND_API_KEY to your environment.",
    };
  }

  const resend = new Resend(apiKey);

  try {
    // Convert plain text body to simple HTML
    const htmlBody = params.body
      .split("\n\n")
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
      .join("");

    const { data, error } = await resend.emails.send({
      from: params.from || "SponsorMatch <noreply@sponsormatch.com.au>",
      to: params.to,
      replyTo: params.replyTo,
      subject: params.subject,
      text: params.body,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend error:", error);
      return {
        success: false,
        error: error.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Email send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Send admin notification for new user signup
 */
export async function sendNewUserNotification(user: {
  email: string;
  name?: string | null;
  provider?: string;
}): Promise<void> {
  const adminEmail = "steve@collectivecamp.us";
  const signupMethod = user.provider === "google" ? "Google OAuth" : "Email/Password";

  try {
    await sendEmail({
      to: adminEmail,
      replyTo: adminEmail,
      subject: `🎉 New SponsorMatch Signup: ${user.email}`,
      body: `A new user has signed up for SponsorMatch!

Email: ${user.email}
Name: ${user.name || "Not provided"}
Signup Method: ${signupMethod}
Time: ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}

View all users in your database to see their activity.`,
    });
  } catch (error) {
    console.error("Failed to send new user notification:", error);
  }
}
