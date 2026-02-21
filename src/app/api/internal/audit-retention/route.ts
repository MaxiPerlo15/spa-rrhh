import { NextRequest, NextResponse } from 'next/server'
import { purgeExpiredAdminAuditLogs } from '@/lib/auditRetention'
import { logger } from '@/lib/logger'

function getProvidedSecret(request: NextRequest): string {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }

  return request.headers.get('x-cron-secret')?.trim() || ''
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.AUDIT_CRON_SECRET?.trim()
  if (!expectedSecret) {
    logger.error('AUDIT_CRON_SECRET no configurado para purga de auditoría', new Error('missing env'))
    return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 })
  }

  const providedSecret = getProvidedSecret(request)
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const summary = await purgeExpiredAdminAuditLogs()
    logger.info('Purga de auditoría ejecutada', summary)
    return NextResponse.json({
      message: 'Purga de auditoría ejecutada',
      summary
    })
  } catch (error) {
    logger.error('Error al ejecutar purga de auditoría', error)
    return NextResponse.json({ error: 'Error al ejecutar purga de auditoría' }, { status: 500 })
  }
}
