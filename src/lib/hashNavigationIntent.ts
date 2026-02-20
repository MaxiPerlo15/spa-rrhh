const HASH_NAV_INTENT_KEY = 'landing_hash_nav_intent_v1'

export function markInternalHashNavigationIntent() {
  try {
    window.sessionStorage.setItem(HASH_NAV_INTENT_KEY, '1')
  } catch {
    // Ignore storage failures (private mode, blocked storage).
  }
}

export function consumeInternalHashNavigationIntent() {
  try {
    const hasIntent = window.sessionStorage.getItem(HASH_NAV_INTENT_KEY) === '1'
    if (hasIntent) {
      window.sessionStorage.removeItem(HASH_NAV_INTENT_KEY)
    }
    return hasIntent
  } catch {
    return false
  }
}

