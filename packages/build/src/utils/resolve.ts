import { join } from 'node:path'

import { resolveModulePath } from 'exsolve'
import { findUp } from 'find-up'
import { createRequire } from 'module'

// TODO: use `import.resolve()` once it is available without any experimental
// flags
const require = createRequire(import.meta.url)

// Like `resolvePath()` but does not throw
export const tryResolvePath = async function (
  path: string,
  basedir: string,
): Promise<{ path: string; error?: undefined } | { path?: undefined; error: unknown }> {
  try {
    const resolvedPath = await resolvePath(path, basedir)
    return { path: resolvedPath }
  } catch (error) {
    return { error }
  }
}

// This throws if the package cannot be found
// eslint-disable-next-line @typescript-eslint/require-await
export const resolvePath = async function (path: string, basedir: string): Promise<string> {
  const resolved = resolveModulePath(path, { from: basedir, cache: false, try: true })
  return resolved ?? require.resolve(path, { paths: [basedir] })
}

// Find a package's `package.json` by walking up `node_modules` directories
// from `basedir`. Unlike module resolution, this is not subject to the
// package's `exports` map.
export const resolvePackageJsonPath = async function (packageName: string, basedir: string): Promise<string> {
  const packageJsonPath = await findUp(join('node_modules', packageName, 'package.json'), { cwd: basedir })
  if (packageJsonPath === undefined) {
    throw new Error(`Could not find package.json for "${packageName}" from "${basedir}"`)
  }
  return packageJsonPath
}
