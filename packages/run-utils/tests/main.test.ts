import { execPath, platform } from 'process'
import { fileURLToPath } from 'url'

import semver from 'semver'
import { x } from 'tinyexec'
import { test, expect } from 'vitest'

import { run } from '../src/main.js'

const FIXTURES_DIR = fileURLToPath(new URL('fixtures', import.meta.url))
const RUN_FILE = `${FIXTURES_DIR}/run.js`

const runInChildProcess = (file: string, args: string[] = [], options?: Record<string, unknown>) => {
  const optionsA = options === undefined ? [] : [JSON.stringify(options)]
  return x(execPath, [RUN_FILE, file, JSON.stringify(args), ...optionsA], { throwOnError: true })
}

test('Should expose a run method', () => {
  expect(typeof run).toBe('function')
})

// `echo` in `cmd.exe` is different from Unix
if (platform !== 'win32') {
  test('Can run with no arguments', async () => {
    const { stdout } = await run('echo', { stdio: 'pipe' })
    expect(stdout.trim()).toBe('')
  })

  test('Can run with no arguments nor options object', async () => {
    const { stdout } = await run('echo')
    expect(stdout.trim()).toBe('')
  })
}

test('Can run local binaries', async () => {
  const { stdout } = await run('npx', ['--version'], { stdio: 'pipe' })

  expect(semver.valid(stdout)).toBeTruthy()
})

test('Should redirect stdout/stderr to parent', async () => {
  const { stdout } = await runInChildProcess('npx', ['--version'])
  expect(semver.valid(stdout)).toBeTruthy()
})

test('Should not redirect stdout/stderr to parent when using "stdio" option', async () => {
  const { stdout } = await runInChildProcess('ava', ['--version'], { stdio: 'pipe' })
  expect(stdout).toBe('')
})

test('Should not redirect stdout/stderr to parent when using the "stdio" array option', async () => {
  const { stdout } = await runInChildProcess('ava', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] })
  expect(stdout).toBe('')
})
