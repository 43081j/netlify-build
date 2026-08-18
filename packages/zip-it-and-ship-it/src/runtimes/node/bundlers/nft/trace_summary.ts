import { resolve } from 'path'

import type { NodeFileTraceReasons } from '@vercel/nft'

import type { RuntimeCache } from '../../../../utils/cache.js'
import { cachedLstat } from '../../../../utils/fs.js'

const TOP_FILES_COUNT = 5

export interface TracedFile {
  // Relative path of the file
  path: string
  bytes: number
  // The file that included it
  parent?: string
}

export interface TraceSummary {
  totalBytes: number
  topFiles: TracedFile[]
}

const getFileSize = async (cache: RuntimeCache, path: string) => {
  try {
    const stat = await cachedLstat(cache.lstatCache, path)
    return stat.isFile() ? stat.size : 0
  } catch {
    return 0
  }
}

export const getTraceSummary = async ({
  basePath,
  cache,
  fileList,
  reasons,
}: {
  basePath?: string
  cache: RuntimeCache
  fileList: Set<string>
  reasons: NodeFileTraceReasons
}): Promise<TraceSummary> => {
  const files: TracedFile[] = await Promise.all(
    [...fileList].map(async (path) => {
      const bytes = await getFileSize(cache, basePath ? resolve(basePath, path) : resolve(path))
      const reason = reasons.get(path)
      const parent = reason === undefined ? undefined : [...reason.parents][0]

      return { path, bytes, parent }
    }),
  )
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  const topFiles = files.sort((first, second) => second.bytes - first.bytes).slice(0, TOP_FILES_COUNT)

  return { totalBytes, topFiles }
}
