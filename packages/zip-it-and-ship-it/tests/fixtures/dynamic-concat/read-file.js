const { readFile } = require('fs/promises')

const helpers = {
  getFileName: () => {
    return 'data.json'
  },
}

exports.handler = async function () {
  const data = await readFile(__dirname + '/assets/' + helpers.getFileName(), 'utf8')

  return { statusCode: 200, body: data }
}
