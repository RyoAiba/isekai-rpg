import { keyBindings } from './KeyBindings'
import type { InputAction, InputListener } from './types'

export class InputManager {
  private static initialized = false
  private static pressedActions = new Set<InputAction>()
  private static heldActions = new Set<InputAction>()
  private static releasedActions = new Set<InputAction>()
  private static listeners = new Set<InputListener>()

  static initialize() {
    if (this.initialized || typeof window === 'undefined') {
      return
    }

    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
    this.initialized = true
  }

  static destroy() {
    if (!this.initialized || typeof window === 'undefined') {
      return
    }

    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
    this.pressedActions.clear()
    this.heldActions.clear()
    this.releasedActions.clear()
    this.listeners.clear()
    this.initialized = false
  }

  static update() {
    this.pressedActions.clear()
    this.releasedActions.clear()
  }

  static subscribe(listener: InputListener) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  static confirm() {
    return this.pressedActions.has('confirm')
  }

  static cancel() {
    return this.pressedActions.has('cancel')
  }

  static up() {
    return this.pressedActions.has('up')
  }

  static down() {
    return this.pressedActions.has('down')
  }

  static left() {
    return this.pressedActions.has('left')
  }

  static right() {
    return this.pressedActions.has('right')
  }

  private static handleKeyDown = (event: KeyboardEvent) => {
    const action = keyBindings[event.key]

    if (!action) {
      return
    }

    event.preventDefault()

    if (!event.repeat) {
      this.pressedActions.add(action)
    }

    this.heldActions.add(action)
    this.notifyListeners()
    this.pressedActions.clear()
  }

  private static handleKeyUp = (event: KeyboardEvent) => {
    const action = keyBindings[event.key]

    if (!action) {
      return
    }

    event.preventDefault()
    this.heldActions.delete(action)
    this.releasedActions.add(action)
    this.notifyListeners()
    this.releasedActions.clear()
  }

  private static notifyListeners() {
    this.listeners.forEach((listener) => listener())
  }
}
