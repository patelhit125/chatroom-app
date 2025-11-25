import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAuthPage = req.nextUrl.pathname.startsWith("/auth/signin");

    // If user is authenticated and trying to access sign-in page
    if (token && isAuthPage) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: [
    "/chat/:path*",
    "/api/wallet/:path*",
    "/api/chat/:path*",
    "/api/users/:path*",
    "/auth/signin",
  ],
};
