import React, { useEffect } from 'react'

export function isMacOS() {
  return /Mac OS X/.test(navigator.userAgent)
}

export enum KEY_CODE {
  Unknown = 0,
  Backspace = 8,
  Tab = 9,
  Enter = 13,
  Shift = 16,
  Ctrl = 17,
  Alt = 18,
  PauseBreak = 19,
  CapsLock = 20,
  Escape = 27,
  Space = 32,
  PageUp = 33,
  PageDown = 34,
  End = 35,
  Home = 36,
  LeftArrow = 37,
  UpArrow = 38,
  RightArrow = 39,
  DownArrow = 40,
  Insert = 45,
  Delete = 46,
  KEY_0 = 48,
  KEY_1 = 49,
  KEY_2 = 50,
  KEY_3 = 51,
  KEY_4 = 52,
  KEY_5 = 53,
  KEY_6 = 54,
  KEY_7 = 55,
  KEY_8 = 56,
  KEY_9 = 57,
  KEY_A = 65,
  KEY_B = 66,
  KEY_C = 67,
  KEY_D = 68,
  KEY_E = 69,
  KEY_F = 70,
  KEY_G = 71,
  KEY_H = 72,
  KEY_I = 73,
  KEY_J = 74,
  KEY_K = 75,
  KEY_L = 76,
  KEY_M = 77,
  KEY_N = 78,
  KEY_O = 79,
  KEY_P = 80,
  KEY_Q = 81,
  KEY_R = 82,
  KEY_S = 83,
  KEY_T = 84,
  KEY_U = 85,
  KEY_V = 86,
  KEY_W = 87,
  KEY_X = 88,
  KEY_Y = 89,
  KEY_Z = 90,
  Meta = 91,
  F1 = 112,
  F2 = 113,
  F3 = 114,
  F4 = 115,
  F5 = 116,
  F6 = 117,
  F7 = 118,
  F8 = 119,
  F9 = 120,
  F10 = 121,
  F11 = 122,
  F12 = 123,
  NumLock = 144,
  ScrollLock = 145,
  Equal = 187,
  Minus = 189,
  Backquote = 192,
  Backslash = 220
}

export enum KEY_MOD {
  CtrlCmd = (1 << 11) >>> 0,
  Shift = (1 << 10) >>> 0,
  Alt = (1 << 9) >>> 0,
  WinCtrl = (1 << 8) >>> 0
}

const CTRL_CMD = isMacOS() ? 'metaKey' : 'ctrlKey'

const WIN_CTRL = isMacOS() ? 'ctrlKey' : 'metaKey'

function getActiveModMap(bindings: number[]) {
  const modBindings = bindings.filter((item: number) => !!KEY_MOD[item])
  const activeModMap: Record<keyof typeof KEY_MOD, boolean> = {
    CtrlCmd: false,
    Shift: false,
    Alt: false,
    WinCtrl: false
  }
  modBindings.forEach((code) => {
    const modKey = KEY_MOD[code] as keyof typeof KEY_MOD
    activeModMap[modKey] = true
  })
  return activeModMap
}

export type KeyboardOptions = {
  disableGlobalEvent?: boolean,
  stopPropagation?: boolean,
  preventDefault?: boolean,
  capture?: boolean,
  event?: 'keydown' | 'keypress' | 'keyup'
}

export type KeyboardResult = {
  bindings: {
    onKeyDown: React.KeyboardEventHandler,
    onKeyDownCapture: React.KeyboardEventHandler,
    onKeyPress: React.KeyboardEventHandler,
    onKeyPressCapture: React.KeyboardEventHandler,
    onKeyUp: React.KeyboardEventHandler,
    onKeyUpCapture: React.KeyboardEventHandler
  }
}

export type UseKeyboardHandler = (event: React.KeyboardEvent | KeyboardEvent) => void

export function useKeyboard(
  handler: UseKeyboardHandler,
  keyBindings: Array<number> | number,
  options: KeyboardOptions = {}
): KeyboardResult {
  const bindings = Array.isArray(keyBindings) ? keyBindings : [keyBindings]
  const {
    disableGlobalEvent = false,
    capture = false,
    stopPropagation = false,
    preventDefault = true,
    event = 'keydown'
  } = options
  const activeModMap = getActiveModMap(bindings)
  const keyCode = bindings.filter((item: number) => !KEY_MOD[item])

  const eventHandler = (event: React.KeyboardEvent | KeyboardEvent) => {
    if (activeModMap.Shift && !event.shiftKey) { return }
    if (activeModMap.Alt && !event.altKey) { return }
    if (activeModMap.CtrlCmd && !event[CTRL_CMD]) { return }
    if (activeModMap.WinCtrl && !event[WIN_CTRL]) { return }
    const hitOne = keyCode.find((k) => k === event.keyCode)
    if (keyCode && !hitOne) { return }
    if (stopPropagation) {
      event.stopPropagation()
    }
    if (preventDefault) {
      event.preventDefault()
    }
    if (handler) {
      handler(event)
    }
  }

  useEffect(() => {
    if (!disableGlobalEvent) {
      document.addEventListener(event, eventHandler)
    }
    return () => {
      document.removeEventListener(event, eventHandler)
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disableGlobalEvent])

  const elementBindingHandler = (
    elementEventType: 'keydown' | 'keypress' | 'keyup',
    isCapture: boolean = false
  ) => {
    if (elementEventType !== event) { return () => {} }
    if (isCapture !== capture) { return () => {} }
    return (e: React.KeyboardEvent) => eventHandler(e)
  }

  return {
    bindings: {
      onKeyDown: elementBindingHandler('keydown'),
      onKeyDownCapture: elementBindingHandler('keydown', true),
      onKeyPress: elementBindingHandler('keypress'),
      onKeyPressCapture: elementBindingHandler('keypress', true),
      onKeyUp: elementBindingHandler('keyup'),
      onKeyUpCapture: elementBindingHandler('keyup', true)
    }
  }
}
