const broken = require('./broken.js')

exports.default = async () => new Response(broken.greeting)
