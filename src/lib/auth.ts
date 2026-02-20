import { getServerSession } from "next-auth/next"
import type { NextAuthOptions } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from '@/lib/prisma'
import { clearAttemptFailures, getAttemptLock, recordAttemptFailure } from '@/lib/authAttemptGuard'
import { logger } from '@/lib/logger'

const isProduction = process.env.NODE_ENV === 'production'
const secureCookiesEnabled = isProduction
  ? true
  : process.env.SESSION_COOKIE_SECURE === 'true'

const configuredSameSite = process.env.SESSION_COOKIE_SAME_SITE
const sameSite =
  configuredSameSite === 'strict' || configuredSameSite === 'lax' || configuredSameSite === 'none'
    ? configuredSameSite
    : 'lax'
const cookieSameSite = sameSite === 'none' && !secureCookiesEnabled ? 'lax' : sameSite

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

        const normalizedEmail = String(credentials.email).trim().toLowerCase()
        const forwardedFor = req?.headers?.['x-forwarded-for']
        const ip = Array.isArray(forwardedFor)
          ? forwardedFor[0]?.split(',')[0]?.trim() || 'unknown'
          : forwardedFor?.split(',')[0]?.trim() || 'unknown'
        const identity = `${normalizedEmail}:${ip}`

        const lockState = await getAttemptLock('login', identity)
        if (lockState.blocked) {
          logger.security('auth.login.throttled', {
            email: normalizedEmail,
            ip,
            retryAfterSeconds: lockState.retryAfterSeconds
          })
          throw new Error(`AUTH_THROTTLED:${lockState.retryAfterSeconds}`)
        }

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        })

        if (!user) {
          const attemptState = await recordAttemptFailure('login', identity)
          logger.security('auth.login.failed', {
            email: normalizedEmail,
            ip,
            failures: attemptState.failures,
            blocked: attemptState.blocked
          })
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
          const attemptState = await recordAttemptFailure('login', identity)
          logger.security('auth.login.failed', {
            email: normalizedEmail,
            ip,
            failures: attemptState.failures,
            blocked: attemptState.blocked
          })
          if (attemptState.blocked) {
            throw new Error(`AUTH_THROTTLED:${attemptState.retryAfterSeconds}`)
          }
          return null
        }

        await clearAttemptFailures('login', identity)
        logger.info('Login exitoso', { email: normalizedEmail, ip })

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
        sameSite: cookieSameSite,
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
