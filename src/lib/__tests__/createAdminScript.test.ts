import { describe, expect, it } from 'vitest'

import { parseCreateAdminArgs } from '../../../scripts/create-admin'

describe('create-admin script args', () => {
  it('parsea email password y name desde CLI args', () => {
    expect(
      parseCreateAdminArgs([
        '--email',
        'admin2@empresa.com',
        '--password',
        'Password123!',
        '--name',
        'Admin Dos'
      ])
    ).toEqual({
      email: 'admin2@empresa.com',
      password: 'Password123!',
      name: 'Admin Dos'
    })
  })
})
