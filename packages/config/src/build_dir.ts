import { stat } from 'node:fs/promises'

import { throwUserError } from './error.js'

/**
 * Retrieve the build directory used to resolve most paths.
 * This is (in priority order):
 *  - `build.base`
 *  - `--repositoryRoot`
 *  - the current directory (default value of `--repositoryRoot`)
 */
export const getBuildDir = async function (repositoryRoot: string, base?: string) {
  const buildDir = base === undefined ? repositoryRoot : base
  await checkBuildDir(buildDir, repositoryRoot)
  return buildDir
}

/**
 * The build directory is used as the current directory of build commands and
 * build plugins. Therefore, it must exist.
 * We already check `repositoryRoot` earlier in the code, so only need to check
 * `buildDir` when it is the base directory instead.
 */
const checkBuildDir = async function (buildDir: string, repositoryRoot: string) {
  let isDir: boolean
  try {
    isDir = (await stat(buildDir)).isDirectory()
  } catch {
    isDir = false
  }
  if (buildDir === repositoryRoot || isDir) {
    return
  }

  throwUserError(`Base directory does not exist: ${buildDir}`)
}
