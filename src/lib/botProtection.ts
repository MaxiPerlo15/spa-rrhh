type TurnstileVerificationResult = {
  success: boolean
  reason?: string
}

type TurnstileResponse = {
  success: boolean
  'error-codes'?: string[]
  action?: string
}

export async function verifyTurnstileToken({
  token,
  remoteIp,
  action
}: {
  token?: string
  remoteIp: string
  action: 'contact_form' | 'application_form'
}): Promise<TurnstileVerificationResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { success: false, reason: 'captcha_not_configured' }
    }
    return { success: true }
  }

  if (!token) {
    return { success: false, reason: 'captcha_missing' }
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      remoteip: remoteIp
    })

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!response.ok) {
      return { success: false, reason: 'captcha_verification_error' }
    }

    const result = (await response.json()) as TurnstileResponse
    if (!result.success) {
      return {
        success: false,
        reason: result['error-codes']?.join(',') || 'captcha_rejected'
      }
    }

    if (result.action && result.action !== action) {
      return { success: false, reason: 'captcha_action_mismatch' }
    }

    return { success: true }
  } catch {
    return { success: false, reason: 'captcha_verification_error' }
  }
}
