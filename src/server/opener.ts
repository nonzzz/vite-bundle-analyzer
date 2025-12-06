// MIT LICENSE
// Copyright (c) Domenic Denicola
// https://github.com/domenic/opener/blob/master/LICENSE.txt

// This implementation is based on the `opener` package (It's no longer maintained)
// But we fixed the wsl/wsl2 (maybe)
// In past versions. The wsl/wsl2 os release might be `Microsoft` but now it's full lowercase `microsoft`

import child_process from 'child_process'
import os from 'os'
import { slash } from './shared'

const MS = 'microsoft'
// WSL path to Windows explorer.exe
const WSL_IEXPLORER = '/mnt/c/Windows/explorer.exe'

function isWSL() {
  return os.release().toLocaleLowerCase().indexOf(MS) !== -1
}

function ensureCommander(platform: NodeJS.Platform): [NodeJS.Platform, string] {
  switch (platform) {
    case 'linux': {
      if (isWSL()) {
        return ['win32', WSL_IEXPLORER]
      }
      return ['linux', 'xdg-open']
    }
    case 'win32':
      return ['win32', 'cmd.exe']
    case 'darwin':
      return ['darwin', 'open']
    default:
      return [platform, 'xdg-open']
  }
}

export function opener(argvs: string[]) {
  const [platform, command] = ensureCommander(os.platform())

  // https://stackoverflow.com/questions/154075/using-the-start-command-with-parameters-passed-to-the-started-program/154090#154090
  if (platform === 'win32' && command === 'cmd.exe') {
    argvs = argvs.map((arg) => arg.replace(/[&^]/g, '^$&'))
    argvs = ['/c', 'start', '""'].concat(argvs)
  }

  return child_process.spawn(command, argvs)
}

export function getFileURL(filePath: string) {
  const platform = os.platform()
  if (platform === 'linux' && isWSL()) {
    const winPath = child_process.execSync(`wslpath -w "${filePath}"`, { encoding: 'utf-8' }).trim()
    return `file:///${slash(winPath)}`
  }

  return `file://${filePath}`
}
