const NAVBAR_OFFSET_PX = 72
const MAX_ATTEMPTS = 60
const RETRY_DELAY_MS = 100
const ALIGNMENT_TOLERANCE_PX = 16

function scrollToHashElement(hash: string, behavior: ScrollBehavior) {
  const element = document.querySelector(hash)
  if (!element) {
    return false
  }

  const elementPosition = element.getBoundingClientRect().top + window.scrollY
  const offsetPosition = Math.max(elementPosition - NAVBAR_OFFSET_PX, 0)
  const isAligned = Math.abs(element.getBoundingClientRect().top - NAVBAR_OFFSET_PX) <= ALIGNMENT_TOLERANCE_PX

  if (isAligned) {
    return true
  }

  window.scrollTo({
    top: offsetPosition,
    behavior
  })

  const updatedTop = element.getBoundingClientRect().top
  return Math.abs(updatedTop - NAVBAR_OFFSET_PX) <= ALIGNMENT_TOLERANCE_PX
}

export function scrollToHashWithOffset(hash: string, behavior: ScrollBehavior = 'smooth') {
  if (!hash.startsWith('#')) return

  let attempts = 0
  const tryScroll = () => {
    attempts += 1
    const didScroll = scrollToHashElement(hash, behavior)
    if (!didScroll && attempts < MAX_ATTEMPTS) {
      window.setTimeout(tryScroll, RETRY_DELAY_MS)
    }
  }

  tryScroll()
}
