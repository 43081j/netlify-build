const helpers = {
  getFileName: () => {
    return 'data.json'
  },
}

exports.handler = async function () {
  const data = require('./assets/' + helpers.getFileName())

  return { statusCode: 200, body: JSON.stringify(data) }
}
