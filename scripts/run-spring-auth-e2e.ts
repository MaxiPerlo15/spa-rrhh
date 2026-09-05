import { createHash, randomBytes, randomUUID } from 'node:crypto'
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
const legacyUserId = `spring-e2e-legacy-${runId}`
const targetUserId = `spring-e2e-user-${runId}`
const settingsId = `spring-e2e-settings-${runId}`
const reconciliationRunId = `spring-e2e-run-${runId}`
const reconciliationItemId = `spring-e2e-item-${runId}`
const reconciliationApprovalId = `spring-e2e-approval-${runId}`
const roleId = `spring-e2e-role-${runId}`
const permissionId = `spring-e2e-permission-${runId}`
const snapshotTimestamp = '2026-09-05T00:00:00.000Z'
const databaseTimestamp = '2026-09-05 00:00:00.000+00'
const reportChecksum = createHash('sha256').update('spring-settings-reconciliation-report-v1').digest('hex')
const springAuthE2eSpec = process.env.SPRING_AUTH_E2E_SPEC

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
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const settingsSnapshot = canonicalSnapshot({
      createdAt: snapshotTimestamp, id: settingsId, notificationsEnabled: true,
      notifyNewApplications: true, notifyNewContacts: false, notifySecurityAlerts: true,
      updatedAt: snapshotTimestamp, userId: legacyUserId
    })
    const userSnapshot = canonicalSnapshot({
      createdAt: snapshotTimestamp, email: adminEmail, id: legacyUserId, name: 'Spring E2E Admin',
      passwordHash, role: 'ADMIN', updatedAt: snapshotTimestamp
    })
    const usuarioSnapshot = canonicalSnapshot({
      email: adminEmail, enabled: true, id: targetUserId, nombreUsuario: 'Spring E2E Admin',
      password: passwordHash, passwordResetToken: null, passwordResetTokenExpiry: null, rolId: roleId
    })

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
      [targetUserId, adminEmail, 'Spring E2E Admin', passwordHash, roleId],
    )
    await client.query(
      'INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, CAST($5 AS "Role"), $6, $6)',
      [legacyUserId, adminEmail, 'Spring E2E Admin', passwordHash, 'ADMIN', databaseTimestamp],
    )
    await client.query(
      'INSERT INTO "AdminSettings" ("id", "userId", "notificationsEnabled", "notifyNewApplications", "notifyNewContacts", "notifySecurityAlerts", "createdAt", "updatedAt") VALUES ($1, $2, TRUE, TRUE, FALSE, TRUE, $3, $3)',
      [settingsId, legacyUserId, databaseTimestamp],
    )
    await client.query(
      'INSERT INTO reconciliation_runs (id, catalog_fingerprint, report_checksum, created_at) VALUES ($1, $2, $3, $4)',
      [reconciliationRunId, 'e'.repeat(64), reportChecksum, databaseTimestamp],
    )
    await client.query(
      'INSERT INTO reconciliation_items (id, run_id, admin_settings_id, admin_settings_snapshot, admin_settings_hash, prisma_user_id, prisma_user_snapshot, prisma_user_hash, usuario_id, usuario_snapshot, usuario_hash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [
        reconciliationItemId, reconciliationRunId, settingsId, settingsSnapshot.json, settingsSnapshot.hash,
        legacyUserId, userSnapshot.json, userSnapshot.hash, targetUserId, usuarioSnapshot.json, usuarioSnapshot.hash,
      ],
    )
    await client.query(
      'INSERT INTO reconciliation_approvals (id, item_id, source_id, target_id, verifier_id, report_checksum, status, normalized_email, prisma_user_id, admin_settings_hash, prisma_user_hash, usuario_hash) VALUES ($1, $2, $3, $4, $5, $6, \'MATCHED\', $7, $8, $9, $10, $11)',
      [
        reconciliationApprovalId, reconciliationItemId, settingsId, targetUserId, 'spring-e2e-verifier', reportChecksum,
        adminEmail.toLowerCase(), legacyUserId, settingsSnapshot.hash, userSnapshot.hash, usuarioSnapshot.hash,
      ],
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

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function canonicalSnapshot(value: Record<string, unknown>) {
  const json = JSON.stringify(Object.fromEntries(
    Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0),
  ))
  return { json, hash: sha256(json) }
}

async function flywayContractReady(port: number, version: string, verifySettings = false) {
  const client = new Client({ host: '127.0.0.1', port, database: databaseName, user: 'postgres', password: databasePassword })
  await client.connect()
  try {
    const result = await client.query(
      verifySettings
        ? `SELECT s."usuarioId" = $3
            AND a.status = 'MATCHED'
            AND a.source_id = s."id"
            AND a.target_id = $3
            AND a.prisma_user_id = $6
            AND a.normalized_email = $4
            AND a.report_checksum = $5
            AND r.report_checksum = $5
            AND i.admin_settings_hash = encode(digest(i.admin_settings_snapshot, 'sha256'), 'hex')
            AND i.prisma_user_hash = encode(digest(i.prisma_user_snapshot, 'sha256'), 'hex')
            AND i.usuario_hash = encode(digest(i.usuario_snapshot, 'sha256'), 'hex')
            AND a.admin_settings_hash = i.admin_settings_hash
            AND a.prisma_user_hash = i.prisma_user_hash
            AND a.usuario_hash = i.usuario_hash AS contract_ready
           FROM flyway_schema_history h
           JOIN "AdminSettings" s ON s."id" = $2
           JOIN reconciliation_approvals a ON a.source_id = s."id"
           JOIN reconciliation_items i ON i.id = a.item_id AND i.admin_settings_id = s."id"
           JOIN reconciliation_runs r ON r.id = i.run_id
           WHERE h.version = $1 AND h.success = TRUE`
        : 'SELECT version FROM flyway_schema_history WHERE version = $1 AND success = TRUE',
      verifySettings ? [version, settingsId, targetUserId, adminEmail.toLowerCase(), reportChecksum, legacyUserId] : [version],
    )
    return verifySettings ? result.rows[0]?.contract_ready === true : result.rowCount === 1
  } finally {
    await client.end()
  }
}

async function startSpring(port: number, environment: NodeJS.ProcessEnv) {
  springProcess = spawn('mvn', ['-q', 'spring-boot:run'], {
    cwd: `${root}/backend`,
    env: { ...environment, SERVER_PORT: String(port) },
    stdio: 'inherit',
  })
}

async function stopSpring() {
  const child = springProcess
  springProcess = undefined
  if (!child || child.exitCode !== null || child.killed) return
  child.kill('SIGTERM')
  await once(child, 'exit').catch(() => undefined)
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
  await startSpring(springPort, { ...springEnvironment, SPRING_FLYWAY_TARGET: '4' })
  await waitFor('Flyway V4 staging', () => flywayContractReady(databasePort, '4'))
  await waitFor('Spring Boot staging', async () => {
    const response = await fetch(`${springUrl}/api/v1/health`)
    return response.ok
  })
  await seedAdmin(databasePort)
  await stopSpring()
  await startSpring(springPort, springEnvironment)
  await waitFor('Spring Boot', async () => {
    const response = await fetch(`${springUrl}/api/v1/health`)
    return response.ok
  })
  await waitFor('Flyway V6 settings contract', () => flywayContractReady(databasePort, '6', true))
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
       'playwright', 'test', springAuthE2eSpec || 'tests/e2e/auth-spring-session.spec.ts',
       ...(springAuthE2eSpec ? [] : ['tests/e2e/admin-notifications.spec.ts']),
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
