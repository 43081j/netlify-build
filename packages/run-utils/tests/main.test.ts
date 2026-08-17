import { execPath, platform, version } from 'process'
import { fileURLToPath } from 'url'

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
  const { stdout } = await run('vitest', ['--version'], { stdio: 'pipe' })
  expect(stdout).toMatch(/^vitest\/\d+\.\d+\.\d+/)
})

test('Should redirect stdout/stderr to parent', async () => {
  const { stdout } = await runInChildProcess('node --version')
  expect(stdout).toBe(version)
})

test('Should not redirect stdout/stderr to parent when using "stdio" option', async () => {
  const { stdout } = await runInChildProcess('node', ['--version'], { stdio: 'pipe' })
  expect(stdout).toBe('')
})

test('Should not redirect stdout/stderr to parent when using "stdout" option', async () => {
  const { stdout } = await runInChildProcess('node', ['--version'], { stdout: 'pipe' })
  expect(stdout).toBe('')
})

test('Should not redirect stdout/stderr to parent when using "stderr" option', async () => {
  const { stdout } = await runInChildProcess('node', ['--version'], { stderr: 'pipe' })
  expect(stdout).toBe('')
})
