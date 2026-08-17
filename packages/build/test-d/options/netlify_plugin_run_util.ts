import type { NetlifyPluginUtils, OnPreBuild } from '@netlify/build'
import { expectAssignable, expectError } from 'tsd'

export const testUtilsRun: OnPreBuild = function ({ utils: { run } }: { utils: NetlifyPluginUtils }) {
  expectAssignable<PromiseLike<object>>(run('command'))
  run('command', ['arg'])
  run('command', ['arg'], { stdio: 'pipe' })
  expectError(run('command', ['arg'], { unknownOption: false }))

  expectError(run.command('command'))
}
