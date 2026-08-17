import type { SpawnOptions } from 'child_process'
import process from 'process'

import { x, type Result } from 'tinyexec'

/** Run a command, with arguments being an array */
export const run = (file: string, args?: string[] | SpawnOptions, options?: SpawnOptions) => {
  const [argsA, optionsA = {}] = parseArgs(args, options)
  const childProcess = x(file, argsA, { throwOnError: true, nodeOptions: optionsA })
  redirectOutput(childProcess, optionsA)
  return childProcess
}

/** Both `args` and `options` are optional */
const parseArgs = (args?: string[] | SpawnOptions, options?: SpawnOptions): [string[], SpawnOptions | undefined] => {
  if (Array.isArray(args)) {
    return [args, options]
  }

  if (typeof args === 'object' && args !== null) {
    return [[], args]
  }

  return [[], options]
}

/**
 * Redirect output by default, unless specified otherwise
 * */
const redirectOutput = (childProcess: Result, options: SpawnOptions) => {
  if (options.stdio !== undefined) {
    return
  }

  childProcess.process?.stdout?.pipe(process.stdout)
  childProcess.process?.stderr?.pipe(process.stderr)
}
