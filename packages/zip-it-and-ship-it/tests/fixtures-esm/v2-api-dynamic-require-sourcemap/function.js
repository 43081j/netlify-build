const lang = process.env.TEST_LANGUAGE_FILE || 'en.js'

// The dynamic expression makes esbuild bundle every file matching `./data/*`,
// including the `en.js.map` sourcemap.
const data = require('./data/' + lang)

exports.default = async () =>
  new Response(data.greeting, {
    headers: {
      'content-type': 'text/html',
    },
  })
