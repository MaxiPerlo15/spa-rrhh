type EmailPolicyOptions = {
  allowlist?: Set<string>
  blockDisposable?: boolean
}

type PhoneValidationOptions = {
  required?: boolean
}

type ValidationResult = {
  isValid: boolean
  message?: string
}

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  '10minutemail.com',
  'dispostable.com',
  'guerrillamail.com',
  'mailinator.com',
  'temp-mail.org',
  'tempmail.com',
  'yopmail.com'
])

const PHONE_ALLOWED_CHARS = /^[0-9+\s().-]+$/

function parseCsvToSet(raw?: string): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
}

function extractEmailDomain(email: string): string {
  const [, domain = ''] = email.trim().toLowerCase().split('@')
  return domain
}

function domainMatchesAllowlist(domain: string, allowlist: Set<string>): boolean {
  for (const allowed of allowlist) {
    if (domain === allowed || domain.endsWith(`.${allowed}`)) {
      return true
    }
  }
  return false
}

export function resolveAllowedEmailDomains(): Set<string> {
  return parseCsvToSet(
    process.env.FORM_ALLOWED_EMAIL_DOMAINS || process.env.NEXT_PUBLIC_FORM_ALLOWED_EMAIL_DOMAINS
  )
}

export function shouldBlockDisposableEmails(): boolean {
  const raw = process.env.FORM_BLOCK_DISPOSABLE_EMAILS
  if (!raw) return true
  return raw.toLowerCase() !== 'false'
}

export function getEmailValidationMessage(email: string, options: EmailPolicyOptions = {}): string | undefined {
  const domain = extractEmailDomain(email)
  if (!domain) return 'Email inválido'

  const allowlist = options.allowlist ?? resolveAllowedEmailDomains()
  if (allowlist.size > 0 && !domainMatchesAllowlist(domain, allowlist)) {
    return 'El dominio del email no está permitido'
  }

  const blockDisposable = options.blockDisposable ?? shouldBlockDisposableEmails()
  if (blockDisposable && DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return 'No se permiten correos temporales o descartables'
  }

  return undefined
}

export function validateInternationalPhone(
  phoneValue: string,
  options: PhoneValidationOptions = {}
): ValidationResult {
  const required = options.required ?? false
  const phone = phoneValue.trim()

  if (!phone) {
    return required
      ? { isValid: false, message: 'El teléfono es obligatorio' }
      : { isValid: true }
  }

  if (!PHONE_ALLOWED_CHARS.test(phone)) {
    return {
      isValid: false,
      message: 'El teléfono solo puede contener números, espacios, +, paréntesis, puntos o guiones'
    }
  }

  const plusCount = phone.split('+').length - 1
  if (plusCount > 1 || (plusCount === 1 && !phone.startsWith('+'))) {
    return {
      isValid: false,
      message: 'El signo + solo puede aparecer al inicio del teléfono'
    }
  }

  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) {
    return {
      isValid: false,
      message: 'El teléfono debe tener entre 8 y 15 dígitos'
    }
  }

  return { isValid: true }
}
