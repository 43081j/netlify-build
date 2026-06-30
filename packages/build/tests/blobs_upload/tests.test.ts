import { AsyncLocalStorage } from 'node:async_hooks'
import { access, readFile } from 'node:fs/promises'
import { platform } from 'node:process'
import { join } from 'path'

import { getDeployStore } from '@netlify/blobs'
import { BlobsServer } from '@netlify/blobs/server'
import { Fixture } from '@netlify/testing/lib/fixture.js'
import getPort from 'get-port'
import { type SpyImpl, spyOn } from 'tinyspy'
import tmp from 'tmp-promise'
import { test, beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest'

const TOKEN = 'test'

type FetchImplementation = (origFetch: typeof fetch, ...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>

let fetchSpy: SpyImpl<Parameters<typeof globalThis.fetch>, ReturnType<typeof globalThis.fetch>>
let blobServer: BlobsServer
let blobRequests: Record<string, string[]>

const fetchCustomImplementationStore = new AsyncLocalStorage<{ fetchImplementation: FetchImplementation }>()

beforeAll(() => {
  const origFetch = globalThis.fetch.bind(globalThis)
  // tinyspy is used (rather than `vi.spyOn`) so the global spy survives vitest's `restoreMocks`.
  fetchSpy = spyOn(globalThis, 'fetch', (...args) => {
    const customFetchImpl = fetchCustomImplementationStore.getStore()?.fetchImplementation
    if (customFetchImpl) {
      // we pass origFetch as first argument to allow custom implementation to still use it
      return customFetchImpl(origFetch, ...args)
    }

    return origFetch(...args)
  })
})

afterAll(() => {
  fetchSpy.restore()
})

beforeEach(async () => {
  const port = await getPort()
  blobRequests = {}

  const tmpDir = await tmp.dir()
  blobServer = new BlobsServer({
    port,
    token: TOKEN,
    directory: tmpDir.path,
    onRequest: ({ type, url }) => {
      blobRequests[type] = blobRequests[type] || []
      blobRequests[type].push(url)
    },
  })

  await blobServer.start()

  process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(
    JSON.stringify({
      apiURL: `http://localhost:${port}`,
    }),
  ).toString('base64')
})

afterEach(async () => {
  await blobServer.stop()
  delete process.env.NETLIFY_BLOBS_CONTEXT
})

test('Blobs upload step uploads files when deploy ID is provided and no files in directory', async () => {
  const {
    success,
    logs: { stdout },
  } = (await new Fixture(import.meta.url, './fixtures/src_empty')
    // Passing `offline: true` to avoid fetching the configuration from the API
    .withFlags({ deployId: 'abc123', token: TOKEN, offline: true })
    .runBuildProgrammatic()) as { success: boolean; logs: { stdout: string[] } }

  expect(success).toBe(true)
  expect(blobRequests.set).toBeUndefined()

  expect(stdout.join('\n').includes('Uploading blobs to deploy store')).toBe(false)
})

test('Blobs upload step uploads files when there are files but deploy ID is not provided (legacy API)', async () => {
  const fixture = await new Fixture(import.meta.url, './fixtures/src_with_blobs_legacy').withCopyRoot({ git: false })

  const {
    success,
    logs: { stdout },
  } = (await fixture
    .withFlags({ token: TOKEN, offline: true, cwd: fixture.repositoryRoot })
    .runBuildProgrammatic()) as { success: boolean; logs: { stdout: string[] } }

  expect(success).toBe(true)

  const blobsDir = join(fixture.repositoryRoot, '.netlify', 'blobs', 'deploy')
  await expect(access(blobsDir)).resolves.not.toThrow()

  expect(blobRequests.set).toBeUndefined()

  expect(stdout.join('\n').includes('Uploading blobs to deploy store')).toBe(false)
})

test('Blobs upload step uploads files to deploy store (legacy API)', async () => {
  const fixture = await new Fixture(import.meta.url, './fixtures/src_with_blobs_legacy').withCopyRoot({ git: false })

  const { success } = (await fixture
    .withFlags({ deployId: 'abc123', siteId: 'test', token: TOKEN, offline: true, cwd: fixture.repositoryRoot })
    .runBuildProgrammatic()) as { success: boolean }

  expect(success).toBe(true)
  expect(blobRequests.set.length).toBe(6)

  const defaultRegionRequests = blobRequests.set.filter((urlPath) => {
    const url = new URL(urlPath, 'http://localhost')

    return url.searchParams.get('region') === 'us-east-2'
  })

  expect(defaultRegionRequests.length).toBe(3)

  const storeOpts = { deployID: 'abc123', siteID: 'test', token: TOKEN }
  const store = getDeployStore(storeOpts)

  const blob1 = (await store.getWithMetadata('something.txt'))!
  expect(blob1.data).toBe('some value')
  expect(blob1.metadata).toEqual({})

  const blob2 = (await store.getWithMetadata('with-metadata.txt'))!
  expect(blob2.data).toBe('another value')
  expect(blob2.metadata).toEqual({ meta: 'data', number: 1234 })

  const blob3 = (await store.getWithMetadata('nested/file.txt'))!
  expect(blob3.data).toBe('file value')
  expect(blob3.metadata).toEqual({ some: 'metadata' })
})

test('Blobs upload step uploads files to deploy store (legacy deploy config API)', async () => {
  const fixture = await new Fixture(import.meta.url, './fixtures/src_with_blobs_legacy_deploy_config').withCopyRoot({
    git: false,
  })

  const { success } = (await fixture
    .withFlags({ deployId: 'abc123', siteId: 'test', token: TOKEN, offline: true, cwd: fixture.repositoryRoot })
    .runBuildProgrammatic()) as { success: boolean }
  expect(success).toBe(true)
  expect(blobRequests.set.length).toBe(6)

  const regionAutoRequests = blobRequests.set.filter((urlPath) => {
    const url = new URL(urlPath, 'http://localhost')

    return url.searchParams.get('region') === 'auto'
  })

  expect(regionAutoRequests.length).toBe(3)

  const storeOpts = { deployID: 'abc123', siteID: 'test', token: TOKEN }
  const store = getDeployStore(storeOpts)

  const blob1 = (await store.getWithMetadata('something.txt'))!
  expect(blob1.data).toBe('some value')
  expect(blob1.metadata).toEqual({})

  const blob2 = (await store.getWithMetadata('with-metadata.txt'))!
  expect(blob2.data).toBe('another value')
  expect(blob2.metadata).toEqual({ meta: 'data', number: 1234 })

  const blob3 = (await store.getWithMetadata('nested/file.txt'))!
  expect(blob3.data).toBe('file value')
  expect(blob3.metadata).toEqual({ some: 'metadata' })
})

test('Blobs upload step uploads files to deploy store', async () => {
  const fixture = await new Fixture(import.meta.url, './fixtures/src_with_blobs').withCopyRoot({ git: false })

  const { success } = (await fixture
    .withFlags({ deployId: 'abc123', siteId: 'test', token: TOKEN, offline: true, cwd: fixture.repositoryRoot })
    .runBuildProgrammatic()) as { success: boolean }

  expect(success).toBe(true)

  // 3 requests for getting pre-signed URLs + 3 requests for hitting them.
  expect(blobRequests.set.length).toBe(6)

  const regionAutoRequests = blobRequests.set.filter((urlPath) => {
    const url = new URL(urlPath, 'http://localhost')

    return url.searchParams.get('region') === 'auto'
  })

  expect(regionAutoRequests.length).toBe(3)

  const storeOpts = { deployID: 'abc123', siteID: 'test', token: TOKEN }
  const store = getDeployStore(storeOpts)

  const blob1 = (await store.getWithMetadata('something.txt'))!
  expect(blob1.data).toBe('some value')
  expect(blob1.metadata).toEqual({})

  const blob2 = (await store.getWithMetadata('with-metadata.txt'))!
  expect(blob2.data).toBe('another value')
  expect(blob2.metadata).toEqual({ meta: 'data', number: 1234 })

  const blob3 = (await store.getWithMetadata('nested/blob'))!
  expect(blob3.data).toBe('file value')
  expect(blob3.metadata).toEqual({ some: 'metadata' })
})

test('Blobs upload step cancels deploy if blob metadata is malformed', async () => {
  const fixture = await new Fixture(import.meta.url, './fixtures/src_with_malformed_blobs_metadata').withCopyRoot({
    git: false,
  })
  const { success, severityCode } = (await fixture
    .withFlags({ deployId: 'abc123', siteId: 'test', token: TOKEN, offline: true, debug: false })
    .runBuildProgrammatic()) as { success: boolean; severityCode: number }

  const blobsDir = join(fixture.repositoryRoot, '.netlify', 'v1', 'blobs', 'deploy')
  await expect(access(blobsDir)).resolves.not.toThrow()

  expect(blobRequests.set).toBeUndefined()

  expect(success).toBe(false)
  expect(severityCode).toBe(4)
})

test('monorepo > blobs upload, uploads files to deploy store', async () => {
  const fixture = await new Fixture(import.meta.url, './fixtures/monorepo').withCopyRoot({ git: false })
  const { success } = (await fixture
    .withFlags({ deployId: 'abc123', siteId: 'test', token: TOKEN, offline: true, packagePath: 'apps/app-1' })
    .runBuildProgrammatic()) as { success: boolean }

  expect(success).toBe(true)
  expect(blobRequests.set.length).toBe(6)

  const storeOpts = { deployID: 'abc123', siteID: 'test', token: TOKEN }
  const store = getDeployStore(storeOpts)

  const blob1 = (await store.getWithMetadata('something.txt'))!
  expect(blob1.data).toBe('some value')
  expect(blob1.metadata).toEqual({})

  const blob2 = (await store.getWithMetadata('with-metadata.txt'))!
  expect(blob2.data).toBe('another value')
  expect(blob2.metadata).toEqual({ meta: 'data', number: 1234 })

  const blob3 = (await store.getWithMetadata('nested/file.txt'))!
  expect(blob3.data).toBe('file value')
  expect(blob3.metadata).toEqual({ some: 'metadata' })
})

test('Blobs upload failure print full error stack and cause to systemlog', async () => {
  const fixture = await new Fixture(import.meta.url, './fixtures/src_with_blobs').withCopyRoot({ git: false })

  const systemLogFile = await tmp.file()

  const {
    success,
    logs: { stdout, stderr },
  } = (await fetchCustomImplementationStore.run(
    {
      fetchImplementation: (origFetch, ...args) => {
        if (
          typeof args[0] === 'string' &&
          args[0].includes('api/v1/blobs') &&
          typeof args[1] === 'object' &&
          args[1].method === 'put'
        ) {
          throw new Error('Simulated upload error with cause', {
            cause: new Error('Outer internal error', { cause: new Error('Nested internal error') }),
          })
        }
        return origFetch(...args)
      },
    },
    () =>
      fixture
        .withFlags({
          deployId: 'abc123',
          siteId: 'test',
          token: TOKEN,
          offline: true,
          cwd: fixture.repositoryRoot,
          debug: false,
          systemLogFile: systemLogFile.fd,
        })
        .runBuildProgrammatic(),
  )) as { success: boolean; logs: { stdout: string[]; stderr: string[] } }

  expect(success).toBe(false)

  // No file descriptors on Windows, so system logging doesn't work.
  if (platform !== 'win32') {
    const systemLog = await readFile(systemLogFile.path, { encoding: 'utf8' })
    // nested internal error visible in system log
    expect(systemLog.includes('Nested internal error')).toBe(true)
  }

  // internals don't leak to regular output
  expect(stdout.join('\n').includes('Nested internal error')).toBe(false)
  expect(stderr.join('\n').includes('Nested internal error')).toBe(false)
})
