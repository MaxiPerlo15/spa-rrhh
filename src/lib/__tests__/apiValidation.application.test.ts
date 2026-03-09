import { describe, expect, it } from 'vitest'
import { createApplicationSchema } from '@/lib/apiValidation'

describe('createApplicationSchema', () => {
  const basePayload = {
    candidateName: 'Maxi Perlo',
    email: 'maxi@example.com',
    phone: '+5493533418702',
    acceptedPrivacy: true
  }

  it('acepta postulación con vacancyId', () => {
    const parsed = createApplicationSchema.safeParse({
      ...basePayload,
      vacancyId: 'cmc7q8v1r0000v5r4f9k0m2n3'
    })

    expect(parsed.success).toBe(true)
  })

  it('acepta postulación espontánea sin vacancyId', () => {
    const parsed = createApplicationSchema.safeParse(basePayload)
    expect(parsed.success).toBe(true)
  })
})

