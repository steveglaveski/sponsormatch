import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

/**
 * GET /api/gmail/connect
 * Initiates Gmail OAuth flow to get permission to send emails
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "Google OAuth not configured" },
        { status: 500 }
      );
    }

    // Build the callback URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/gmail/callback`;

    // Create state token to prevent CSRF (includes user ID)
    const state = Buffer.from(
      JSON.stringify({
        userId: session.user.id,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline", // Required to get refresh token
      prompt: "consent", // Force consent to ensure we get refresh token
      state,
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;

    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Gmail connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Gmail connection" },
      { status: 500 }
    );
  }
}
