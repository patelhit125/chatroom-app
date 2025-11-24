import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth/signin",
  },
});

export const config = {
  matcher: [
    "/",
    "/chat/:path*",
    "/api/wallet/:path*",
    "/api/chat/:path*",
    "/api/users/:path*",
  ],
};
