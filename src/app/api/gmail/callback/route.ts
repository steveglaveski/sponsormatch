import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * GET /api/gmail/callback
 * Handles the OAuth callback from Google after user authorizes Gmail access
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Handle errors from Google
    if (error) {
      console.error("Gmail OAuth error:", error);
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail_error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail_error=missing_params`
      );
    }

    // Decode and validate state
    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail_error=invalid_state`
      );
    }

    // Check state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail_error=expired_state`
      );
    }

    const { userId } = stateData;

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/gmail/callback`;
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail_error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!refresh_token) {
      console.error("No refresh token received");
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail_error=no_refresh_token`
      );
    }

    // Get user's Gmail address
    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        `${baseUrl}/settings?gmail_error=userinfo_failed`
      );
    }

    const userInfo = await userInfoResponse.json();
    const gmailEmail = userInfo.email;

    // Calculate token expiry
    const expiryDate = new Date(Date.now() + expires_in * 1000);

    // Update user with Gmail credentials
    await prisma.user.update({
      where: { id: userId },
      data: {
        gmailConnected: true,
        gmailEmail,
        gmailRefreshToken: refresh_token,
        gmailTokenExpiry: expiryDate,
      },
    });

    // Redirect back to settings with success
    return NextResponse.redirect(`${baseUrl}/settings?gmail_connected=true`);
  } catch (error) {
    console.error("Gmail callback error:", error);
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${baseUrl}/settings?gmail_error=callback_failed`
    );
  }
}
