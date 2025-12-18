// Validador de variables de entorno requeridas
const requiredVars = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'RESEND_API_KEY',
  'UPLOADTHING_TOKEN'
]

for (const v of requiredVars) {
  if (!process.env[v]) {
    throw new Error(`Falta la variable de entorno requerida: ${v}`)
  }
}
