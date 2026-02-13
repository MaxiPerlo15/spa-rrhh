import { getServerSession } from "next-auth/next"
import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from '@/lib/prisma'
import { clearAttemptFailures, getAttemptLock, recordAttemptFailure } from '@/lib/authAttemptGuard'

const defaultSecureCookies = process.env.NODE_ENV === 'production'
const secureCookiesEnabled = process.env.SESSION_COOKIE_SECURE
  ? process.env.SESSION_COOKIE_SECURE === 'true'
  : defaultSecureCookies

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const normalizedEmail = String(credentials.email).toLowerCase()
        const forwardedFor = req?.headers?.['x-forwarded-for']
        const ip = Array.isArray(forwardedFor)
          ? forwardedFor[0]?.split(',')[0]?.trim() || 'unknown'
          : forwardedFor?.split(',')[0]?.trim() || 'unknown'
        const identity = `${normalizedEmail}:${ip}`

        const lockState = getAttemptLock('login', identity)
        if (lockState.blocked) {
          throw new Error(`AUTH_THROTTLED:${lockState.retryAfterSeconds}`)
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        })

        if (!user) {
          const attemptState = recordAttemptFailure('login', identity)
          if (attemptState.blocked) {
            throw new Error(`AUTH_THROTTLED:${attemptState.retryAfterSeconds}`)
          }
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )

        if (!isValidPassword) {
          const attemptState = recordAttemptFailure('login', identity)
          if (attemptState.blocked) {
            throw new Error(`AUTH_THROTTLED:${attemptState.retryAfterSeconds}`)
          }
          return null
        }

        clearAttemptFailures('login', identity)

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    })
  ],
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
  useSecureCookies: secureCookiesEnabled,
  cookies: {
    sessionToken: {
      name: secureCookiesEnabled ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: secureCookiesEnabled
      }
    }
  },
  secret: process.env.NEXTAUTH_SECRET
}

export function auth() {
  return getServerSession(authOptions)
}
