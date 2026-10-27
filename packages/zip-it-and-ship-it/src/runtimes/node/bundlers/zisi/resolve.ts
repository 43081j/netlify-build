import { createRequire } from 'module'
import { join } from 'path'

import { resolveModulePath } from 'exsolve'
import { findUp } from 'find-up'

const require = createRequire(import.meta.url)

// Find the path to a module's `package.json` by walking up `node_modules`
// directories from each base directory. Unlike module resolution, this is not
// subject to the package's `exports` field, which can forbid resolving
// `package.json` directly.
export const resolvePackage = async function (moduleName: string, baseDirs: string[]): Promise<string> {
  const packageJsonPath = join('node_modules', moduleName, 'package.json')

  for (const baseDir of baseDirs) {
    const packagePath = await findUp(packageJsonPath, { cwd: baseDir })

    if (packagePath !== undefined) {
      return packagePath
    }
  }

  const error = new Error(`Cannot find module '${moduleName}'`)
  ;(error as Error & { code: string }).code = 'MODULE_NOT_FOUND'
  throw error
}

// We need to use `exsolve` instead of `require.resolve()` because it can
// preserve symlinks:
//  - this is important because if a file does a `require('./symlink')`, we
//    need to bundle the symlink and its target, not only the target
//  - `path.resolve()` cannot be used for relative|absolute file paths
//    because it does not resolve omitted file extension,
//    e.g. `require('./file')` instead of `require('./file.js')`
//  - the CLI flag `--preserve-symlinks` can be used with Node.js, but it
//    cannot be set runtime
// `exsolve` follows ESM resolution rules, which reject some specifiers that
// CommonJS accepts, such as package names starting with a dot
// (e.g. `.prisma/client`). We fall back to `require.resolve()` for those.
// eslint-disable-next-line @typescript-eslint/require-await
export const resolvePathPreserveSymlinks = async function (path: string, baseDirs: string[]): Promise<string> {
  try {
    return resolveModulePath(path, {
      from: baseDirs.map((dir) => `${dir}/`),
      conditions: ['node', 'require'],
      extensions: ['.js', '.json', '.node'],
      suffixes: ['', '/index'],
      preserveSymlinks: true,
      cache: false,
    })
  } catch {
    return require.resolve(path, { paths: baseDirs })
  }
}
