// Because `package.json` doesn't have `type: "module"`, this function gets a
// CommonJS output format, which cannot represent a top-level await.
const greeting = await Promise.resolve('Hello world from top-level await')

export default async () =>
  new Response(`<h1>${greeting}</h1>`, {
    headers: {
      'content-type': 'text/html',
    },
  })
