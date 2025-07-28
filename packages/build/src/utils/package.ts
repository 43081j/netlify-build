import { dirname } from 'path'

import { type PackageJson, readPackageJSON } from 'pkg-types'
import { up as findPackageUp } from 'empathic/package'

type PackageResult = {
  packageJson: PackageJson
  packageDir?: string
}

/**
 * Retrieve `package.json` from a specific directory
 */
export const getPackageJson = async function (cwd: string): Promise<PackageResult> {
  const result: PackageResult = {
    packageJson: {},
  }

  try {
    const packagePath = findPackageUp({ cwd })
    if (packagePath) {
      const readResult = await readPackageJSON(packagePath)

      result.packageJson = readResult
      result.packageDir = dirname(packagePath)
    }
  } catch {
    // continue regardless error
  }
  return result
}
