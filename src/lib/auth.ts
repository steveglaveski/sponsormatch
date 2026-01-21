import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { sendNewUserNotification } from "@/services/email-sender";
import { canSignupFromIp, isIpWhitelisted } from "./ip";
import { MAX_ACCOUNTS_PER_IP } from "./constants";

/**
 * Get client IP from headers (for use in NextAuth callbacks)
 */
async function getClientIpFromHeaders(): Promise<string | null> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }
  return headersList.get("x-real-ip") || headersList.get("cf-connecting-ip") || null;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  events: {
    async createUser({ user }) {
      // Store signup IP for OAuth users
      const clientIp = await getClientIpFromHeaders();
      if (clientIp && user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { signupIp: clientIp },
        });
      }

      // Send notification when a new user signs up via OAuth
      if (user.email) {
        sendNewUserNotification({
          email: user.email,
          name: user.name,
          provider: "google",
        });
      }
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      // Debug logging
      console.log("[NextAuth] signIn callback:", {
        userId: user?.id,
        email: user?.email,
        provider: account?.provider
      });

      // For OAuth providers, check if this is a new user and apply IP restrictions
      if (account?.provider === "google" && user?.email) {
        // Check if user already existed BEFORE this OAuth flow
        // We can tell by checking if they have any linked accounts yet
        const existingAccount = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "google"
          },
        });

        // If no existing google account, this is a new OAuth signup
        // The adapter creates the user first, then links the account after signIn returns
        // So if there's no account yet, this is the initial signup
        if (!existingAccount) {
          const clientIp = await getClientIpFromHeaders();
          const ipCheck = await canSignupFromIp(clientIp);

          if (!ipCheck.allowed) {
            console.log("[NextAuth] Blocked OAuth signup from IP:", clientIp);

            // Clean up the user record that the adapter just created
            // since we're rejecting this signup
            try {
              await prisma.user.delete({
                where: { id: user.id },
              });
              console.log("[NextAuth] Cleaned up user record after IP block:", user.id);
            } catch (e) {
              console.error("[NextAuth] Failed to cleanup user after IP block:", e);
            }

            // Return false to deny sign-in - this prevents OAuthCreateAccount error
            // The error will show as AccessDenied, but login page handles this
            return false;
          }
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // On initial sign in, user and account are available
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      // Debug logging
      if (account) {
        console.log("[NextAuth] jwt callback with account:", {
          provider: account.provider,
          userId: user?.id
        });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
