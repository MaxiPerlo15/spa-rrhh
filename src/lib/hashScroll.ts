const NAVBAR_OFFSET_PX = 72
const ALIGNMENT_TOLERANCE_PX = 16
const RETRY_DELAYS_MS = [0, 100, 220, 420]
let activeScrollSequence = 0

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

  const sequenceId = ++activeScrollSequence
  const tryScroll = (attemptIndex: number) => {
    if (sequenceId !== activeScrollSequence) return

    const attemptBehavior: ScrollBehavior = attemptIndex > 0 ? 'auto' : behavior
    const didScroll = scrollToHashElement(hash, attemptBehavior)
    if (!didScroll && attemptIndex < RETRY_DELAYS_MS.length - 1) {
      window.setTimeout(() => tryScroll(attemptIndex + 1), RETRY_DELAYS_MS[attemptIndex + 1])
    }
  }

  tryScroll(0)
}
