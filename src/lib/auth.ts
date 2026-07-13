import { getServerSession } from "next-auth/next"
import type { NextAuthOptions } from "next-auth"

// NOTE: Credentials provider removed in Phase 4 (PR 4) — admin auth is now Spring-only.
// The NextAuth route is kept for potential future providers (OAuth, etc.).
//
// ROLLBACK PROCEDURE:
// To re-enable NextAuth Credentials login within 5 minutes:
//   1. Restore the Credentials import: import Credentials from "next-auth/providers/credentials"
//   2. Restore authorizeAdminCredentials function (see git history for the Prisma-based version)
//   3. Add the Credentials provider entry back to the providers array in authOptions
//   4. Ensure PRISMA_USER_TABLE is populated (it is retained as dormant for exactly this scenario)
//   5. Redeploy — NextAuth will handle login via Prisma User table as before

export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    }
  },
  pages: {
    signIn: '/admin/signin',
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60
  },
  jwt: {
    maxAge: 60 * 60 * 8
  },
  secret: process.env.NEXTAUTH_SECRET
}

export function auth() {
  return getServerSession(authOptions)
}
