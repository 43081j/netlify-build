const pkg = require('exports-pkg')
// pkg has both `main: ./legacy.js` and `exports.': ./modern.js`.
// Node honors `exports` and resolves to modern.js — so `pkg.flavor === 'modern'`.
// If a bundler ignores `exports`, it'll bundle legacy.js instead.

exports.handler = async function () {
  return { flavor: pkg.flavor }
}
