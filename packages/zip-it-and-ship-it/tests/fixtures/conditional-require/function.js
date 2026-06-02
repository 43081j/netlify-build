// `some-missing-module` is not installed and not declared in package.json.
// The require is guarded by try/catch, so at runtime this is harmless.
// nft / esbuild handle this leniently; zisi aborts the bundle.
let optionalLib = null
try {
  optionalLib = require('some-missing-module')
} catch {}

exports.handler = async function () {
  return { available: Boolean(optionalLib) }
}
