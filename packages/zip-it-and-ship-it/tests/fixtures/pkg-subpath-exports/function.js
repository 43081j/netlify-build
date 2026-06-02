// At runtime Node honors `exports` and resolves `subpath-pkg/feat`
// to `./internal/feat.js`. There is no `feat.js` at the package root,
// so any bundler that resolves via filesystem path (ignoring exports)
// will fail to locate it.
const feat = require('subpath-pkg/feat')

exports.handler = async function () {
  return { value: feat() }
}
