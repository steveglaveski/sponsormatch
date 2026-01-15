import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/search/:path*",
    "/sponsors/:path*",
    "/email/:path*",
    "/settings/:path*",
  ],
};
