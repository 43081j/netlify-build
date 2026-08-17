[![Coverage Status](https://codecov.io/gh/netlify/build/branch/main/graph/badge.svg)](https://codecov.io/gh/netlify/build)
[![Build](https://github.com/netlify/build/workflows/Build/badge.svg)](https://github.com/netlify/build/actions)

Utility for running commands inside Netlify Build

Currently, there is just one utility, `run`, which is a thin wrapper over
[`tinyexec`](https://github.com/tinylibs/tinyexec). Local binaries can be run by default and output is redirected to the
parent process unless the `stdio` option is set.

# Examples

```js
// Runs `eslint src/ test/` and prints the result
// Either local or global binaries can be run
const exampleNetlifyPlugin = {
  async onBuild({ utils: { run } }) {
    await run('eslint', ['src/', 'test/'])
  },
}
```

```js
// Retrieve command's output and exit code as variables
const exampleNetlifyPlugin = {
  async onBuild({ utils: { run } }) {
    const { stdout, stderr, exitCode } = await run('eslint', ['src/', 'test/'])
    console.log({ stdout, stderr, exitCode })
  },
}
```

```js
// Streaming mode
const exampleNetlifyPlugin = {
  onBuild({ utils: { run } }) {
    const { process } = run('eslint', ['src/', 'test/'])
    process.stdout.pipe(fs.createWriteStream('stdout.txt'))
  },
}
```

```js
// If the command exit code is not 0 or was terminated by a signal, an error
// is thrown with failure information
const exampleNetlifyPlugin = {
  async onBuild({ utils: { run } }) {
    try {
      await run('eslint', ['does_not_exist'])
    } catch (error) {
      console.error(error)
    }
  },
}
```

```js
// Pass environment variables
const exampleNetlifyPlugin = {
  async onBuild({ utils: { run } }) {
    await run('eslint', ['src/', 'test/'], { env: { TEST: 'true' } })
  },
}
```

# API

## run(file, arguments, options?)

Execute a command/file.
