import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import bcrypt from 'bcrypt'
import { Client } from 'pg'

const execFileAsync = promisify(execFile)
const root = process.cwd()
const runId = randomUUID()
const containerName = `spa-rrhh-spring-e2e-${runId}`
const databaseName = 'rrhh_e2e'
const databasePassword = randomBytes(24).toString('hex')
const adminEmail = `spring-e2e-${runId}@example.test`
const adminPassword = randomBytes(24).toString('base64url')
const internalApiToken = randomBytes(32).toString('hex')

let springProcess: ReturnType<typeof spawn> | undefined
let nextProcess: ReturnType<typeof spawn> | undefined

async function command(
  commandName: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  return execFileAsync(commandName, args, { ...options, maxBuffer: 1024 * 1024 })
}

async function availablePort() {
  const server = net.createServer()
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  server.close()
  if (!address || typeof address === 'string') throw new Error('Could not allocate a local Spring port')
  return address.port
}

async function waitFor(description: string, check: () => Promise<boolean>) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    try {
      if (await check()) return
    } catch {
      // Services are expected to be unavailable while they are starting.
    }
    await new Promise(resolve => setTimeout(resolve, 1_000))
  }
  throw new Error(`Timed out waiting for ${description}`)
}

async function seedAdmin(port: number) {
  const client = new Client({
    host: '127.0.0.1',
    port,
    database: databaseName,
    user: 'postgres',
    password: databasePassword,
  })
  await client.connect()
  try {
    const roleId = `spring-e2e-role-${runId}`
    const permissionId = `spring-e2e-permission-${runId}`
    const userId = `spring-e2e-user-${runId}`
    const passwordHash = await bcrypt.hash(adminPassword, 12)

    await client.query('BEGIN')
    await client.query(
      'INSERT INTO permiso (id, nombre, descripcion) VALUES ($1, $2, $3)',
      [permissionId, 'admin:access', 'Ephemeral browser-test admin access'],
    )
    await client.query(
      'INSERT INTO rol (id, nombre, descripcion) VALUES ($1, $2, $3)',
      [roleId, 'ADMIN', 'Ephemeral browser-test administrator'],
    )
    await client.query(
      'INSERT INTO rol_permiso (rol_id, permiso_id) VALUES ($1, $2)',
      [roleId, permissionId],
    )
    await client.query(
      'INSERT INTO usuario (id, email, enabled, nombre_usuario, password, rol_id) VALUES ($1, $2, TRUE, $3, $4, $5)',
      [userId, adminEmail, 'Spring E2E Admin', passwordHash, roleId],
    )
    await client.query(
      'INSERT INTO "AdminNotification" ("id", "title", "message", "level", "isRead", "createdAt", "updatedAt") VALUES ($1, $2, $3, CAST($4 AS "NotificationLevel"), FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP), ($5, $6, $7, CAST($4 AS "NotificationLevel"), FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [
        'spring-notification-read', 'Spring notification to read', 'This item proves PATCH through Next.', 'INFO',
        'spring-notification-delete', 'Spring notification to delete', 'This item proves DELETE through Next.',
      ],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    await client.end()
  }
}

async function directLoginPreflight(springUrl: string) {
  const response = await fetch(`${springUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const sessionCookie = response.headers.get('set-cookie')
  if (response.status !== 200 || !sessionCookie?.includes('SESSIONID=')) {
    throw new Error(`Spring login preflight failed: expected 200 plus SESSIONID, received ${response.status}`)
  }
  if (/;\s*Secure\b/i.test(sessionCookie)) {
    throw new Error('Spring login preflight failed: temporary HTTP browser session must not set Secure')
  }
}

async function cleanup() {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM')
    await once(nextProcess, 'exit').catch(() => undefined)
  }
  if (springProcess && !springProcess.killed) {
    springProcess.kill('SIGTERM')
    await once(springProcess, 'exit').catch(() => undefined)
  }
  await command('docker', ['rm', '--force', containerName]).catch(() => undefined)
}

async function main() {
  const springPort = await availablePort()
  await command('docker', [
    'run', '--detach', '--rm', '--name', containerName,
    '--env', `POSTGRES_PASSWORD=${databasePassword}`,
    '--env', `POSTGRES_DB=${databaseName}`,
    '--publish', '127.0.0.1::5432',
    'postgres:16',
  ])

  const { stdout: portOutput } = await command('docker', ['port', containerName, '5432/tcp'])
  const databasePort = Number(portOutput.trim().match(/:(\d+)$/)?.[1])
  if (!Number.isInteger(databasePort)) throw new Error('Could not determine the temporary PostgreSQL port')

  await waitFor('temporary PostgreSQL', async () => {
    const result = await command('docker', ['exec', containerName, 'pg_isready', '-U', 'postgres', '-d', databaseName])
    return result.stderr.length === 0
  })

  const springUrl = `http://127.0.0.1:${springPort}`
  const databaseUrl = `postgresql://postgres:${databasePassword}@127.0.0.1:${databasePort}/${databaseName}?schema=public`
  const springEnvironment = {
    ...process.env,
    SPRING_DATASOURCE_URL: `jdbc:postgresql://127.0.0.1:${databasePort}/${databaseName}`,
    SPRING_DATASOURCE_USERNAME: 'postgres',
    SPRING_DATASOURCE_PASSWORD: databasePassword,
    SERVER_PORT: String(springPort),
    SERVER_SERVLET_SESSION_COOKIE_SECURE: 'false',
    RRHH_SECURITY_INTERNAL_API_TOKEN: internalApiToken,
  }
  springProcess = spawn('mvn', ['-q', 'spring-boot:run'], {
    cwd: `${root}/backend`,
    env: springEnvironment,
    stdio: 'inherit',
  })

  await waitFor('Spring Boot', async () => {
    const response = await fetch(`${springUrl}/api/v1/health`)
    return response.ok
  })
  await seedAdmin(databasePort)
  await directLoginPreflight(springUrl)

  const nextPort = await availablePort()
  const nextUrl = `http://localhost:${nextPort}`
  const browserEnvironment = {
    ...process.env,
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD: adminPassword,
    BACKEND_URL: springUrl,
    BACKEND_INTERNAL_API_TOKEN: internalApiToken,
    CORS_ALLOWED_ORIGINS: nextUrl,
    DATABASE_URL: databaseUrl,
    E2E_BASE_URL: nextUrl,
    NEXTAUTH_SECRET: randomBytes(32).toString('hex'),
    SESSION_COOKIE_SECURE: 'false',
    SPRING_AUTH_ENABLED: 'true',
    NEXT_PUBLIC_SPRING_AUTH_ENABLED: 'true',
  }
  nextProcess = spawn('npx', ['next', 'dev', '-H', 'localhost', '-p', String(nextPort)], {
    cwd: root,
    env: browserEnvironment,
    stdio: 'inherit',
  })
  await waitFor('Next.js', async () => {
    const response = await fetch(`${nextUrl}/admin/signin`)
    return response.ok
  })

  await command(
    'npx',
    [
       'playwright', 'test', 'tests/e2e/auth-spring-session.spec.ts', 'tests/e2e/admin-notifications.spec.ts',
      '--config', 'playwright.local.config.ts', '--project=chromium',
    ],
    {
      cwd: root,
      env: browserEnvironment,
    },
  ).catch(error => {
    throw new Error(
      `Chromium Spring auth proof failed:\n${String(error.stdout || '')}${String(error.stderr || error.message)}`,
    )
  })
}

main()
  .then(() => console.log('Spring Chromium login → /admin → logout proof passed.'))
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(cleanup)
