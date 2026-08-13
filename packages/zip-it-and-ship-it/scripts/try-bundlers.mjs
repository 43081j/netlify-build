import { execSync } from 'node:child_process'
import { rmSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs, styleText } from 'node:util'

import { zipFunction } from '../dist/main.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = resolve(__dirname, '..')
const FIXTURES_ROOT = join(PKG_ROOT, 'tests', 'fixtures')

const FIXTURES = [
  { name: 'simple', path: 'simple', entry: 'function.js' },
  { name: 'local-require', path: 'local-require', entry: 'function/function.js' },
  { name: 'node-module-and-local-imports', path: 'node-module-and-local-imports', entry: 'function.js' },
  { name: 'node-typescript', path: 'node-typescript', entry: 'function.ts' },
  { name: 'dynamic-require', path: 'dynamic-require', entry: 'function.js' },
  { name: 'dynamic-concat-require', path: 'dynamic-concat', entry: 'require.js' },
  { name: 'dynamic-concat-readfile', path: 'dynamic-concat', entry: 'read-file.js' },
  { name: 'conditional-require', path: 'conditional-require', entry: 'function.js' },
  { name: 'nested-node-modules', path: 'nested-node-modules', entry: 'function.js' },
  { name: 'pkg-exports', path: 'pkg-exports', entry: 'function.js' },
  { name: 'nested-pnpm', path: 'nested-pnpm', entry: 'function.js' },
  { name: 'pkg-subpath-exports', path: 'pkg-subpath-exports', entry: 'function.js' },
  {
    name: 'gatsby-starter',
    path: 'gatsby-starter',
    entry: '.netlify/functions-internal/ssr-engine/ssr-engine.js',
  },
  {
    name: 'gatsby-e2e',
    path: 'gatsby-e2e',
    entry: '.netlify/functions-internal/ssr-engine/ssr-engine.js',
  },
  {
    name: 'gatsby-starter-v2',
    path: 'gatsby-starter',
    entry: 'functions-v2/ssr-engine.mjs',
  },
  {
    name: 'gatsby-e2e-v2',
    path: 'gatsby-e2e',
    entry: 'functions-v2/ssr-engine.mjs',
  },
]

const BUNDLERS = ['esbuild', 'nft', 'zisi', 'none']

const { values: args } = parseArgs({
  options: {
    fixture: { type: 'string' },
    bundler: { type: 'string', multiple: true },
    keep: { type: 'boolean', default: false },
  },
})

const fixtures = args.fixture ? FIXTURES.filter((f) => f.name === args.fixture) : FIXTURES
const bundlers = args.bundler ? BUNDLERS.filter((b) => args.bundler.includes(b)) : BUNDLERS

if (fixtures.length === 0) {
  console.error(`Unknown fixture: ${args.fixture}. Known: ${FIXTURES.map((f) => f.name).join(', ')}`)
  process.exit(1)
}
if (bundlers.length === 0) {
  console.error(`Unknown bundler: ${args.bundler}. Known: ${BUNDLERS.join(', ')}`)
  process.exit(1)
}

const outRoot = join(PKG_ROOT, '.playground')
rmSync(outRoot, { recursive: true, force: true })
mkdirSync(outRoot, { recursive: true })

console.log(`output dir: ${outRoot}\n`)

for (const fixture of fixtures) {
  const srcPath = join(FIXTURES_ROOT, fixture.path, fixture.entry)
  const configPath = join(FIXTURES_ROOT, fixture.path, fixture.entry.replace(/\.js$/, '.json'));
  let config = {};
  try {
    ({config} = JSON.parse(await readFile(configPath, 'utf8')));
  } catch {
    // do nothing
  }
  console.log(`${styleText(['bold', 'bgWhite', 'black'], fixture.name)} (${srcPath.replace(PKG_ROOT, '.')})`);

  for (const bundler of bundlers) {
    const destFolder = join(outRoot, fixture.name, bundler)
    mkdirSync(destFolder, { recursive: true })

    console.log(`// ${styleText(['bgGreen', 'black'], bundler)}`);

    try {
      config.nodeBundler = bundler;
      const result = await zipFunction(srcPath, destFolder, {
        basePath: join(FIXTURES_ROOT, fixture.path),
        config: {'*': config}
      })

      if (!result) {
        console.log('no function detected')
        continue
      }

      const size = statSync(result.path).size
      console.log(`size: ${(size / 1024).toFixed(1)} KiB`);
      console.log(`path: ${result.path.replace(outRoot, '.')}`);
      console.log(`entry: ${result.entryFilename}`);
      console.log(`bundler: ${result.bundler}`);

      if (args.keep) {
        const unpacked = join(destFolder, 'unpacked')
        mkdirSync(unpacked, { recursive: true })
        try {
          execSync(`unzip -qq -o "${result.path}" -d "${unpacked}"`)
          const files = listAll(unpacked).map((p) => p.replace(unpacked + '/', ''))
          console.log(`files: (${files.length}):`)
          for (const f of files.slice(0, 20)) {
            console.log(`- ${f}`);
          }
          if (files.length > 20) {
            console.log(`... and ${files.length - 20} more`)
          }
        } catch (e) {
          console.log(`(unzip failed: ${e.message})`)
        }
      }
    } catch (err) {
      console.log(`FAIL  ${err.toString().split('\n')[0]}`)
    }
  }

  console.log()
}

console.log(`output at ${outRoot}`)

if (process.env.PERF) {
  setInterval(() => {}, 60_000);
}

function listAll(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const s = statSync(p)
    if (s.isDirectory()) out.push(...listAll(p))
    else out.push(p)
  }
  return out
}
