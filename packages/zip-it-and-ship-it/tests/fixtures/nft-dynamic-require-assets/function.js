const name = process.env.ASSET_NAME || 'data'

// eslint-disable-next-line import/no-dynamic-require
const asset = require('./assets/' + name)

module.exports.handler = async () => asset
