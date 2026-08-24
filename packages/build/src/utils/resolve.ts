import { resolveModulePath } from 'exsolve'
import { createRequire } from 'module'

// TODO: use `import.resolve()` once it is available without any experimental
// flags
const require = createRequire(import.meta.url)

// Like `resolvePath()` but does not throw
export const tryResolvePath = async function (
  path: string,
  basedir: string,
): Promise<{ path: string } | { error: unknown }> {
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
  try {
    return resolvePathWithBasedir(path, basedir)
    // Fallback.
    // `resolve` sometimes gives unhelpful error messages.
    // https://github.com/browserify/resolve/issues/223
  } catch {
    return require.resolve(path, { paths: [basedir] })
  }
}

// Like `require.resolve()` but as an external library.
const resolvePathWithBasedir = function (path: string, basedir: string): string {
  const resolvedPath = resolveModulePath(path, { from: basedir, try: true })

  if (resolvedPath === undefined) {
    throw new Error(`Could not resolve "${path}"`)
  }

  return resolvedPath
}
