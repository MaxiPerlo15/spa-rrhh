import { z } from 'zod'
import {
  getEmailValidationMessage,
  resolveAllowedEmailDomains,
  shouldBlockDisposableEmails,
  validateInternationalPhone,
} from '@/lib/formValidationPolicy'
import { validateNewPassword } from '@/lib/passwordReset'

const nonEmptyString = z.string().trim().min(1, 'Campo requerido')
const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  })

export const routeIdSchema = z.object({
  id: z.string().cuid('ID inválido')
})

const vacancyWorkdaySchema = z.enum(['FULL_TIME', 'PART_TIME', 'PROJECT_BASED', 'INTERNSHIP'])
const vacancyModalitySchema = z.enum(['ON_SITE', 'REMOTE', 'HYBRID'])
type VacancyStatus = 'ACTIVE' | 'CLOSED' | 'DRAFT'

const applicationStatusSchema = z.enum(['PENDING', 'REVIEWING', 'INTERVIEWED', 'ACCEPTED', 'REJECTED'])
const contactStatusSchema = z.enum(['PENDING', 'RESPONDED', 'ARCHIVED'])
const allowedEmailDomains = resolveAllowedEmailDomains()
const blockDisposableEmails = shouldBlockDisposableEmails()

const emailSchema = z.string().trim().email('Email inválido').superRefine((value, context) => {
  const message = getEmailValidationMessage(value, {
    allowlist: allowedEmailDomains,
    blockDisposable: blockDisposableEmails
  })

  if (message) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message
    })
  }
})

const requiredPhoneSchema = z.string().trim().superRefine((value, context) => {
  const result = validateInternationalPhone(value, { required: true })
  if (!result.isValid) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.message || 'Teléfono inválido'
    })
  }
})

const optionalPhoneSchema = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? '')
  .superRefine((value, context) => {
    const result = validateInternationalPhone(value, { required: false })
    if (!result.isValid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.message || 'Teléfono inválido'
      })
    }
  })

export const vacanciesListQuerySchema = z.object({
  all: z
    .enum(['1', 'true', 'yes', 'on', '0', 'false', 'no', 'off'])
    .optional()
    .transform((value) => {
      if (!value) return false
      return ['1', 'true', 'yes', 'on'].includes(value)
    })
})

export const createVacancySchema = z.object({
  title: nonEmptyString,
  description: nonEmptyString,
  location: nonEmptyString,
  workday: vacancyWorkdaySchema,
  modality: vacancyModalitySchema,
  salary: optionalTrimmedString,
  requirements: optionalTrimmedString,
  benefits: optionalTrimmedString
})

const updateVacancyStatusSchema = z
  .enum(['active', 'closed', 'draft', 'ACTIVE', 'CLOSED', 'DRAFT'])
  .transform((status) => status.toUpperCase() as VacancyStatus)

export const updateVacancySchema = z
  .object({
    title: optionalTrimmedString,
    description: optionalTrimmedString,
    location: optionalTrimmedString,
    workday: vacancyWorkdaySchema.optional(),
    modality: vacancyModalitySchema.optional(),
    salary: optionalTrimmedString,
    requirements: optionalTrimmedString,
    benefits: optionalTrimmedString,
    status: updateVacancyStatusSchema.optional()
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'Debes enviar al menos un campo para actualizar'
  })

export const applicationsListQuerySchema = z.object({
  vacancyId: z.string().cuid('vacancyId inválido').optional(),
  status: applicationStatusSchema.optional()
})

export const createApplicationSchema = z.object({
  vacancyId: z.string().cuid('vacancyId inválido'),
  candidateName: nonEmptyString,
  email: emailSchema,
  phone: requiredPhoneSchema,
  resumeUrl: z.string().url('resumeUrl inválido').optional(),
  resumeFileName: optionalTrimmedString,
  resumeKey: optionalTrimmedString,
  coverLetter: optionalTrimmedString,
  captchaToken: optionalTrimmedString
})

export const updateApplicationStatusSchema = z.object({
  status: applicationStatusSchema
})

export const contactsListQuerySchema = z.object({
  status: contactStatusSchema.optional()
})

export const createContactSchema = z.object({
  name: nonEmptyString,
  email: emailSchema,
  phone: optionalPhoneSchema,
  subject: nonEmptyString,
  message: nonEmptyString,
  captchaToken: optionalTrimmedString
})

export const updateContactStatusSchema = z.object({
  status: contactStatusSchema
})

const passwordSchema = z.string().superRefine((value, context) => {
  const message = validateNewPassword(value)
  if (message) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message
    })
  }
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email inválido')
})

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'Token inválido'),
    password: passwordSchema,
    confirmPassword: z.string().trim().min(1, 'Debes confirmar la contraseña')
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  })

const notificationLevelSchema = z.enum(['INFO', 'SUCCESS', 'WARNING'])

export const adminNotificationsListQuerySchema = z.object({
  view: z.enum(['all', 'unread', 'read']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
})

export const createAdminNotificationSchema = z.object({
  title: nonEmptyString.max(120, 'Título demasiado largo'),
  message: nonEmptyString.max(500, 'Mensaje demasiado largo'),
  level: notificationLevelSchema.optional().default('INFO')
})

export const updateAdminNotificationSchema = z.object({
  isRead: z.boolean()
})

export function formatValidationError(error: z.ZodError) {
  return {
    error: 'Datos inválidos',
    details: error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }))
  }
}
