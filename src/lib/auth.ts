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

const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const cookiePrefix = useSecureCookies ? "__Secure-" : "";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: true,
  cookies: {
    state: {
      name: `${cookiePrefix}next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
    pkceCodeVerifier: {
      name: `${cookiePrefix}next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "none",
        path: "/",
        secure: true,
      },
    },
  },
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
      try {
        // Store signup IP for OAuth users
        const clientIp = await getClientIpFromHeaders();
        if (clientIp && user.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { signupIp: clientIp },
          });
        }
      } catch (e) {
        console.error("[NextAuth] createUser event error:", e);
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
      try {
        // For OAuth providers, check if this is a new user and apply IP restrictions
        if (account?.provider === "google" && user?.email) {
          const existingAccount = await prisma.account.findFirst({
            where: {
              userId: user.id,
              provider: "google"
            },
          });

          if (!existingAccount) {
            let clientIp: string | null = null;
            try {
              clientIp = await getClientIpFromHeaders();
            } catch {
              console.warn("[NextAuth] Could not read headers for IP check");
            }
            const ipCheck = await canSignupFromIp(clientIp);

            if (!ipCheck.allowed) {
              console.log("[NextAuth] Blocked OAuth signup from IP:", clientIp);
              try {
                await prisma.user.delete({ where: { id: user.id } });
              } catch (e) {
                console.error("[NextAuth] Failed to cleanup user after IP block:", e);
              }
              return false;
            }
          }
        }
      } catch (error) {
        console.error("[NextAuth] signIn callback error:", error);
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
