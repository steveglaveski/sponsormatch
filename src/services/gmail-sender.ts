import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export interface GmailSendParams {
  userId: string;
  to: string;
  subject: string;
  body: string;
}

export interface GmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Refresh the Gmail access token using the stored refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

/**
 * Create a MIME email message
 */
function createMimeMessage(
  from: string,
  to: string,
  subject: string,
  body: string
): string {
  // Convert plain text body to HTML
  const htmlBody = body
    .split("\n\n")
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const boundary = `boundary_${Date.now()}`;

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ];

  return messageParts.join("\r\n");
}

/**
 * Encode message for Gmail API (base64url encoding)
 */
function encodeMessage(message: string): string {
  // Convert to base64url encoding (URL-safe base64)
  const base64 = Buffer.from(message).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Send an email using Gmail API
 */
export async function sendEmailViaGmail(
  params: GmailSendParams
): Promise<GmailSendResult> {
  try {
    // Get user's Gmail credentials
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        gmailConnected: true,
        gmailEmail: true,
        gmailRefreshToken: true,
      },
    });

    if (!user?.gmailConnected || !user.gmailRefreshToken || !user.gmailEmail) {
      return {
        success: false,
        error: "Gmail not connected",
      };
    }

    // Get fresh access token
    const accessToken = await refreshAccessToken(user.gmailRefreshToken);
    if (!accessToken) {
      // Token refresh failed - mark Gmail as disconnected
      await prisma.user.update({
        where: { id: params.userId },
        data: {
          gmailConnected: false,
          gmailRefreshToken: null,
          gmailTokenExpiry: null,
        },
      });

      return {
        success: false,
        error: "Gmail authentication expired. Please reconnect your Gmail account.",
      };
    }

    // Create MIME message
    const mimeMessage = createMimeMessage(
      user.gmailEmail,
      params.to,
      params.subject,
      params.body
    );

    // Encode message
    const encodedMessage = encodeMessage(mimeMessage);

    // Send via Gmail API
    const response = await fetch(GMAIL_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gmail send error:", errorData);

      // Check for specific errors
      if (response.status === 401) {
        // Token invalid - disconnect Gmail
        await prisma.user.update({
          where: { id: params.userId },
          data: {
            gmailConnected: false,
            gmailRefreshToken: null,
            gmailTokenExpiry: null,
          },
        });
        return {
          success: false,
          error: "Gmail authentication expired. Please reconnect your Gmail account.",
        };
      }

      return {
        success: false,
        error: errorData.error?.message || "Failed to send email via Gmail",
      };
    }

    const result = await response.json();

    return {
      success: true,
      messageId: result.id,
    };
  } catch (error) {
    console.error("Gmail send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Check if a user has Gmail connected
 */
export async function isGmailConnected(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gmailConnected: true },
  });

  return user?.gmailConnected ?? false;
}

/**
 * Get user's connected Gmail address
 */
export async function getGmailAddress(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gmailEmail: true, gmailConnected: true },
  });

  return user?.gmailConnected ? user.gmailEmail : null;
}
