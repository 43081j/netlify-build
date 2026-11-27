import { promises as fs } from 'node:fs'

const DEPLOY_ID_SOURCE_TYPES = ['cookie', 'header', 'query'] as const

export type DeployIDSourceType = (typeof DEPLOY_ID_SOURCE_TYPES)[number]

export interface DeployIDSource {
  type: DeployIDSourceType
  name: string
}

export interface SkewProtectionConfig {
  patterns: string[]
  sources: DeployIDSource[]
}

const isRecord = (input: unknown): input is Record<string, unknown> =>
  typeof input === 'object' && input !== null && !Array.isArray(input)

const isDeployIDSourceType = (input: unknown): input is DeployIDSourceType =>
  DEPLOY_ID_SOURCE_TYPES.includes(input as DeployIDSourceType)

const ERROR_PREFIX = 'Invalid skew protection configuration'

const parseDeployIDSource = (input: unknown, path: string): DeployIDSource => {
  if (!isRecord(input)) {
    throw new Error(`${ERROR_PREFIX}: expected ${path} to be an object`)
  }

  const { type, name } = input

  if (!isDeployIDSourceType(type)) {
    throw new Error(`${ERROR_PREFIX}: expected ${path}.type to be one of ${DEPLOY_ID_SOURCE_TYPES.join(', ')}`)
  }

  if (typeof name !== 'string') {
    throw new Error(`${ERROR_PREFIX}: expected ${path}.name to be a string`)
  }

  return { type, name }
}

const parseSkewProtectionConfig = (input: unknown): SkewProtectionConfig => {
  if (!isRecord(input)) {
    throw new Error(`${ERROR_PREFIX}: expected an object`)
  }

  if (!Array.isArray(input.patterns)) {
    throw new Error(`${ERROR_PREFIX}: expected patterns to be an array`)
  }

  if (!Array.isArray(input.sources)) {
    throw new Error(`${ERROR_PREFIX}: expected sources to be an array`)
  }

  const patterns: string[] = []

  for (const [index, pattern] of input.patterns.entries()) {
    if (typeof pattern !== 'string') {
      throw new Error(`${ERROR_PREFIX}: expected patterns.${index} to be a string`)
    }

    patterns.push(pattern)
  }

  const sources = input.sources.map((source: unknown, index) => parseDeployIDSource(source, `sources.${index}`))

  return { patterns, sources }
}

export const loadSkewProtectionConfig = async (configPath: string) => {
  let parsedData: unknown

  try {
    const data = await fs.readFile(configPath, 'utf8')

    parsedData = JSON.parse(data)
  } catch (error) {
    // If the file doesn't exist, this is a non-error.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return
    }

    throw new Error(ERROR_PREFIX, { cause: error })
  }

  return parseSkewProtectionConfig(parsedData)
}
