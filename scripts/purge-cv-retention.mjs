const endpoint =
  process.env.CV_RETENTION_PURGE_ENDPOINT || 'http://localhost:3000/api/internal/cv-retention'
const secret = process.env.CV_RETENTION_CRON_SECRET

if (!secret) {
  console.error('CV_RETENTION_CRON_SECRET no está configurado.')
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
  console.error('Error al ejecutar purga de retención de CV:', response.status, payload)
  process.exit(1)
}

console.log('Purga de retención de CV ejecutada correctamente.')
console.log(JSON.stringify(payload, null, 2))
