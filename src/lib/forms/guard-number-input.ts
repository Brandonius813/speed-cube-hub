export const GUARDED_NUMBER_INPUT_CLASSNAME = "guarded-number-input"

type GuardedNumberKeyEvent = {
  key: string
  preventDefault: () => void
}

type GuardedNumberWheelEvent = {
  currentTarget: {
    blur: () => void
  }
  preventDefault: () => void
}

export function shouldPreventGuardedNumberInputKey(key: string): boolean {
  return key === "ArrowUp" || key === "ArrowDown"
}

export function preventGuardedNumberInputKey(event: GuardedNumberKeyEvent) {
  if (shouldPreventGuardedNumberInputKey(event.key)) {
    event.preventDefault()
  }
}

export function preventGuardedNumberInputWheel(event: GuardedNumberWheelEvent) {
  event.preventDefault()
  event.currentTarget.blur()
}
