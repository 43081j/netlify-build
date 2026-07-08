import { dirname, extname, resolve } from 'path'

import { build, formatMessages, BuildFailure, BuildOptions, Message } from 'esbuild'

import type { FunctionConfig } from '../../../../config.js'
import { FunctionBundlingUserError } from '../../../../utils/error.js'
import { getPathWithExtension } from '../../../../utils/fs.js'
import type { Logger } from '../../../../utils/logger.js'
import { RUNTIME } from '../../../runtime.js'
import { CJS_SHIM } from '../../utils/esm_cjs_compat.js'
import { MODULE_FORMAT, MODULE_FILE_EXTENSION, ModuleFormat } from '../../utils/module_format.js'
import { getClosestPackageJson } from '../../utils/package_json.js'
import { getBundlerTarget } from '../esbuild/bundler_target.js'
import { NODE_BUNDLER } from '../types.js'

type Transformer = {
  aliases: Map<string, string>
  bundle?: boolean
  bundledPaths?: string[]
  format: ModuleFormat
  newMainFile?: string
  rewrites: Map<string, string>
}

/**
 * Returns the module format that should be used for a given function file.
 */
const getModuleFormat = async (
  mainFile: string,
  runtimeAPIVersion: number,
  repositoryRoot?: string,
): Promise<ModuleFormat> => {
  const extension = extname(mainFile)

  // TODO: This check should go away. We should always respect the format from
  // the extension. We'll do this at a later stage, after we roll out the V2
  // API with no side-effects on V1 functions.
  if (runtimeAPIVersion === 2) {
    if (extension === MODULE_FILE_EXTENSION.MJS || extension === MODULE_FILE_EXTENSION.MTS) {
      return MODULE_FORMAT.ESM
    }

    if (extension === MODULE_FILE_EXTENSION.CTS || extension === MODULE_FILE_EXTENSION.CTS) {
      return MODULE_FORMAT.COMMONJS
    }
  }

  // At this point, we need to infer the module type from the `type` field in
  // the closest `package.json`.
  try {
    const packageJSON = await getClosestPackageJson(dirname(mainFile), repositoryRoot)

    if (packageJSON?.contents.type === 'module') {
      return MODULE_FORMAT.ESM
    }
  } catch {
    // no-op
  }

  return MODULE_FORMAT.COMMONJS
}

export const getTransformer = async (
  runtimeAPIVersion: number,
  mainFile: string,
  repositoryRoot?: string,
): Promise<Transformer | undefined> => {
  const format = await getModuleFormat(mainFile, runtimeAPIVersion, repositoryRoot)
  const aliases = new Map<string, string>()
  const rewrites = new Map<string, string>()
  const transformer = {
    aliases,
    format,
    rewrites,
  }

  if (runtimeAPIVersion === 2) {
    // For V2 functions, we want to emit a main file with an unambiguous
    // extension (i.e. `.cjs` or `.mjs`), so that the file is loaded with
    // the correct format regardless of what is set in `package.json`.
    const newExtension = format === MODULE_FORMAT.COMMONJS ? MODULE_FILE_EXTENSION.CJS : MODULE_FILE_EXTENSION.MJS
    const newMainFile = getPathWithExtension(mainFile, newExtension)

    return {
      ...transformer,
      bundle: true,
      bundledPaths: [],
      newMainFile,
    }
  }

  return transformer
}

interface TransformOptions {
  bundle?: boolean
  config: FunctionConfig
  format?: ModuleFormat
  logger: Logger
  name: string
  path: string
}

export const transform = async ({ bundle = false, config, format, logger, name, path }: TransformOptions) => {
  // The version of ECMAScript to use as the build target. This will determine
  // whether certain features are transpiled down or left untransformed.
  const nodeTarget = getBundlerTarget(config.nodeVersion)
  const bundleOptions: BuildOptions = {
    bundle: false,
  }

  if (bundle) {
    bundleOptions.bundle = true
    bundleOptions.packages = 'external'

    // esbuild can end up glob-including files based on dynamic requires
    // like `require('./' + foo)`. So we ignore `.map` here just as a commonly
    // found sibling file we usually don't want. There are other files too
    // but this just saves the error handling having to deal with the common
    // ones.
    bundleOptions.loader = { '.map': 'empty' }

    if (format === MODULE_FORMAT.ESM) {
      bundleOptions.banner = { js: CJS_SHIM }
    }
  }

  const buildWithOptions = async (options: BuildOptions, logLevel: BuildOptions['logLevel']) => {
    const transpiled = await build({
      ...options,
      entryPoints: [path],
      format,
      logLevel,
      metafile: true,
      platform: 'node',
      sourcemap: Boolean(config.nodeSourcemap),
      target: [nodeTarget],
      write: false,
    })
    const bundledPaths = options.bundle ? Object.keys(transpiled.metafile.inputs).map((inputPath) => resolve(inputPath)) : []

    return { bundledPaths, transpiled: transpiled.outputFiles[0].text }
  }

  try {
    // When bundling, run silently. If bundling fails, we may recover with
    // the unbundled fallback below, and only then decide whether the errors
    // should be surfaced.
    return await buildWithOptions(bundleOptions, bundle ? 'silent' : 'error')
  } catch (error) {
    const buildErrors: Message[] = error instanceof Error && 'errors' in error ? (error as BuildFailure).errors : []

    // esbuild will turn a dynamic require into a glob,
    // e.g. `require('./' + x)` will glob `./*` and try load it. This often
    // results in trying to load .map, .d.ts, etc. So we're basically
    // detecting those loader errors here to know if to retry the build
    // without bundling.
    const hasLoaderError = buildErrors.some((buildError) => buildError.text.includes('No loader is configured'))

    if (bundle && hasLoaderError) {
      try {
        const result = await buildWithOptions({ bundle: false }, 'error')

        logger.system(
          `Failed to bundle function '${name}' with esbuild (${String(buildErrors.length)} errors), transpiled it without bundling instead`,
        )

        return result
      } catch {
        // Fall through to report the original bundling error.
      }
    }

    // The original failed build ran silently, so emit its errors now that we
    // know the failure is terminal.
    if (bundle && buildErrors.length > 0) {
      const messages = await formatMessages(buildErrors, { kind: 'error', color: Boolean(process.stderr.isTTY) })

      console.error(messages.join('\n'))
    }

    throw FunctionBundlingUserError.addCustomErrorInfo(error, {
      functionName: name,
      runtime: RUNTIME.JAVASCRIPT,
      bundler: NODE_BUNDLER.NFT,
    })
  }
}
