/**
 * Email Service
 * Centraliza el envío de emails usando Resend
 */

import { Resend } from 'resend'
import { logger } from '@/lib/logger'

// Configuración de emails
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@sparrhh.com'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@sparrhh.com'

// Inicializar Resend solo si hay API key
let resend: Resend | null = null
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY)
}

/**
 * Template HTML para notificación de nueva postulación
 */
function getNewApplicationTemplate(data: {
  vacancyTitle: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  applicantLinkedin?: string
  message?: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Postulación</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                📝 Nueva Postulación
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Se ha recibido una nueva postulación para la vacante:
              </p>
              
              <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <h2 style="margin: 0; font-size: 20px; color: #1e40af;">
                  ${data.vacancyTitle}
                </h2>
              </div>
              
              <h3 style="margin: 30px 0 15px; font-size: 18px; color: #1f2937;">
                Información del Candidato
              </h3>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Nombre:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                    ${data.applicantName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Email:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="mailto:${data.applicantEmail}" style="color: #2563eb; text-decoration: none;">
                      ${data.applicantEmail}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Teléfono:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                    ${data.applicantPhone}
                  </td>
                </tr>
                ${data.applicantLinkedin ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">LinkedIn:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="${data.applicantLinkedin}" style="color: #2563eb; text-decoration: none;">
                      ${data.applicantLinkedin}
                    </a>
                  </td>
                </tr>
                ` : ''}
              </table>
              
              ${data.message ? `
              <h3 style="margin: 30px 0 15px; font-size: 18px; color: #1f2937;">
                Mensaje del Candidato
              </h3>
              <div style="background-color: #f9fafb; padding: 16px; border-radius: 4px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                  ${data.message}
                </p>
              </div>
              ` : ''}
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                <a href="${process.env.NEXTAUTH_URL}/admin" 
                   style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver en Panel Administrativo
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Este es un correo automático generado por el sistema de Meinardi&Perlo RRHH
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Meinardi&Perlo RRHH. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Template HTML para notificación de nuevo contacto
 */
function getNewContactTemplate(data: {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Contacto</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                💬 Nuevo Mensaje de Contacto
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Has recibido un nuevo mensaje a través del formulario de contacto.
              </p>
              
              <h3 style="margin: 30px 0 15px; font-size: 18px; color: #1f2937;">
                Información del Contacto
              </h3>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Nombre:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                    ${data.name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Email:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="mailto:${data.email}" style="color: #10b981; text-decoration: none;">
                      ${data.email}
                    </a>
                  </td>
                </tr>
                ${data.phone ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Teléfono:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                    ${data.phone}
                  </td>
                </tr>
                ` : ''}
                ${data.company ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151;">Empresa:</strong>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
                    ${data.company}
                  </td>
                </tr>
                ` : ''}
              </table>
              
              <h3 style="margin: 30px 0 15px; font-size: 18px; color: #1f2937;">
                Mensaje
              </h3>
              <div style="background-color: #f0fdf4; padding: 16px; border-radius: 4px; border: 1px solid #d1fae5;">
                <p style="margin: 0; color: #6b7280; line-height: 1.6; white-space: pre-line;">
                  ${data.message}
                </p>
              </div>
              
              <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                <a href="${process.env.NEXTAUTH_URL}/admin" 
                   style="display: inline-block; padding: 14px 32px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Ver en Panel Administrativo
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Este es un correo automático generado por el sistema de Meinardi&Perlo RRHH
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Meinardi&Perlo RRHH. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function getPasswordResetTemplate(data: { resetLink: string; expiresMinutes: number }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar contraseña</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px; background: linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%); text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🔐 Recuperar contraseña
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Recibimos una solicitud para restablecer la contraseña del panel administrativo.
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Este enlace expirará en <strong>${data.expiresMinutes} minutos</strong> y solo puede usarse una vez.
              </p>
              <div style="margin-top: 24px; text-align: center;">
                <a href="${data.resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #1d4ed8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  Crear nueva contraseña
                </a>
              </div>
              <p style="margin-top: 28px; font-size: 13px; color: #6b7280; line-height: 1.5;">
                Si no solicitaste este cambio, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

/**
 * Envía notificación por email de una nueva postulación
 */
export async function sendNewApplicationEmail(data: {
  vacancyTitle: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  applicantLinkedin?: string
  message?: string
}) {
  try {
    // Si no hay API key configurada, solo logear
    if (!resend) {
      logger.info('Email de postulación no enviado (modo simulado)', {
        to: ADMIN_EMAIL,
        subject: `Nueva postulación: ${data.vacancyTitle}`,
        from: data.applicantName
      })
      return { success: true, message: 'Email simulado (dev mode)' }
    }

    const { data: emailData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📝 Nueva postulación para: ${data.vacancyTitle}`,
      html: getNewApplicationTemplate(data)
    })

    if (error) {
      logger.error('Error enviando email de postulación', error, {
        vacancyTitle: data.vacancyTitle,
        applicationEmail: data.applicantEmail
      })
      return { success: false, error }
    }

    logger.info('Email de postulación enviado', { emailData })
    return { success: true, data: emailData }
  } catch (error) {
    logger.error('Error al enviar email de postulación', error)
    return { success: false, error }
  }
}

/**
 * Envía notificación por email de un nuevo contacto
 */
export async function sendNewContactEmail(data: {
  name: string
  email: string
  phone?: string
  company?: string
  message: string
}) {
  try {
    // Si no hay API key configurada, solo logear
    if (!resend) {
      logger.info('Email de contacto no enviado (modo simulado)', {
        to: ADMIN_EMAIL,
        subject: `Nuevo contacto de: ${data.name}`,
        from: data.email
      })
      return { success: true, message: 'Email simulado (dev mode)' }
    }

    const { data: emailData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `💬 Nuevo mensaje de contacto de: ${data.name}`,
      html: getNewContactTemplate(data)
    })

    if (error) {
      logger.error('Error enviando email de contacto', error, {
        contactName: data.name,
        contactEmail: data.email
      })  
      return { success: false, error }
    }

    logger.info('Email de contacto enviado', { emailData })
    return { success: true, data: emailData }
  } catch (error) {
    logger.error('Error al enviar email de contacto', error)
    return { success: false, error }
  }
}

export async function sendPasswordResetEmail(data: {
  toEmail: string
  resetLink: string
  expiresMinutes: number
}) {
  try {
    if (!resend) {
      logger.error('Email de reset no enviado (proveedor no configurado)', {
        to: data.toEmail,
        subject: 'Restablece tu contraseña',
        resetLink: data.resetLink
      })
      return { success: false, error: 'EMAIL_PROVIDER_NOT_CONFIGURED' }
    }

    const { data: emailData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.toEmail,
      subject: '🔐 Restablece tu contraseña',
      html: getPasswordResetTemplate({
        resetLink: data.resetLink,
        expiresMinutes: data.expiresMinutes
      })
    })

    if (error) {
      logger.error('Error enviando email de reset', error, {
        resetEmail: data.toEmail
      })
      return { success: false, error: 'EMAIL_SEND_FAILED' }
    }

    logger.info('Email de reset enviado', { emailData })
    return { success: true, data: emailData }
  } catch (error) {
    logger.error('Error al enviar email de reset', error)
    return { success: false, error }
  }
}
