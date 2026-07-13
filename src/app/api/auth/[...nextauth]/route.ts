import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// When SPRING_AUTH_ENABLED is true, the Credentials provider is disabled.
// Admin login flows through Spring POST /api/v1/auth/login instead.
// The NextAuth route is kept for potential future providers (OAuth, etc.).
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
