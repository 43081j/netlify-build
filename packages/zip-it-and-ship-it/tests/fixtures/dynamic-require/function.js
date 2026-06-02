const { runPipeline } = require('./lib/pipeline')

exports.handler = async function () {
  return runPipeline('hello', ['upper', 'reverse'])
}
