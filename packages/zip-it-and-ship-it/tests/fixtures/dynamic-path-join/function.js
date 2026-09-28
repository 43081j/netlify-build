const { readFile } = require('fs/promises')
const path = require('path')

const PUBLIC_DIR = path.join(__dirname, 'public')

const MIME_TYPES = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
}

exports.handler = async (event) => {
  const name = event.queryStringParameters.file
  const filePath = path.join(PUBLIC_DIR, name)

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return { statusCode: 403, body: 'Forbidden' }
  }

  try {
    const body = await readFile(filePath)

    return {
      statusCode: 200,
      headers: { 'content-type': MIME_TYPES[path.extname(filePath)] ?? 'application/octet-stream' },
      body: body.toString('base64'),
      isBase64Encoded: true,
    }
  } catch {
    return { statusCode: 404, body: 'Not found' }
  }
}
