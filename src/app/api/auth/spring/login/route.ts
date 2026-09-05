import { relaySpringAuth } from '../relay'

export async function POST(request: Request) {
  return relaySpringAuth({ path: 'login', request, body: await request.text() })
}
