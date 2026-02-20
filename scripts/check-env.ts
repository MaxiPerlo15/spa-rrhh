import { validateRuntimeEnv } from '../src/lib/checkEnv'

if (process.argv.includes('--prod')) {
  ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
}

try {
  validateRuntimeEnv()
  console.log('[ENV] OK: configuración válida para este entorno.')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[ENV] ERROR:\n${message}`)
  process.exitCode = 1
}
