const lang = process.env.TEST_LANGUAGE_FILE || 'en.js'

// The dynamic expression makes esbuild bundle every file matching `./data/*`,
// including `en.html`, which it has no loader for.
const data = require('./data/' + lang)

exports.default = async () =>
  new Response(data.greeting, {
    headers: {
      'content-type': 'text/html',
    },
  })
