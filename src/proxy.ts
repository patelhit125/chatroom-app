import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const isAuthPage = pathname.startsWith("/auth/");

    // If user is authenticated and trying to access auth pages, redirect to home
    if (token && isAuthPage) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      const redirectUrl = callbackUrl || "/";
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/signin",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Always allow access to auth pages (they handle their own logic)
        if (pathname.startsWith("/auth/")) {
          return true;
        }

        // For protected routes, require token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/",
    "/chat/:path*",
    "/auth/signin",
    // API routes are excluded - they handle their own authentication
    // and return JSON errors instead of HTML redirects
  ],
};
