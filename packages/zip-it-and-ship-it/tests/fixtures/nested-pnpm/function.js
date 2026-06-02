const outer = require('outer')

exports.handler = async function () {
  return outer()
}
