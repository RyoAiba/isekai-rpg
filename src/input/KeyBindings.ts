import type { InputAction } from './types'

export const keyBindings: Record<string, InputAction> = {
  Enter: 'confirm',
  z: 'confirm',
  Z: 'confirm',
  Escape: 'cancel',
  x: 'cancel',
  X: 'cancel',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}
