// A V2 function that wraps the V1 SSR engine emitted by `gatsby-adapter-netlify`.
// Requires a Gatsby build to have run in this fixture first (`npm ci && npm run build`),
// which generates `.netlify/functions-internal/ssr-engine/ssr-engine.js`.
//
// Because this is a V2 function, the NFT bundler runs esbuild with `bundle: true`
// over it, which pulls in the webpack-built engine through the relative import.
import * as engine from '../.netlify/functions-internal/ssr-engine/ssr-engine.js'

export default async (req) => {
  const response = await engine.handler(
    { rawUrl: req.url, httpMethod: req.method, headers: Object.fromEntries(req.headers) },
    {},
  )

  return new Response(response.body, { status: response.statusCode })
}
