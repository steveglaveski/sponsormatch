import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { UserNav } from "@/components/user-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-xl font-bold text-blue-600">
              SponsorMatch
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Dashboard
              </Link>
              <Link
                href="/search"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Find Sponsors
              </Link>
              <Link
                href="/email/history"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Email History
              </Link>
            </nav>
          </div>
          <UserNav user={session.user} />
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
