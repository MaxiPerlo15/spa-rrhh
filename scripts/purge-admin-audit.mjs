const endpoint =
  process.env.AUDIT_PURGE_ENDPOINT || 'http://localhost:3000/api/internal/audit-retention'
const secret = process.env.AUDIT_CRON_SECRET

if (!secret) {
  console.error('AUDIT_CRON_SECRET no está configurado.')
  process.exit(1)
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret}`
  }
})

const payload = await response.json().catch(() => ({}))

if (!response.ok) {
  console.error('Error al ejecutar purga de auditoría:', response.status, payload)
  process.exit(1)
}

console.log('Purga de auditoría ejecutada correctamente.')
console.log(JSON.stringify(payload, null, 2))
