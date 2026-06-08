import type { GatsbyConfig } from "gatsby"
import { siteDescription, title } from "./constants"
import netlifyAdapter from "gatsby-adapter-netlify";

const trailingSlash = (process.env.TRAILING_SLASH ||
  `never`) as GatsbyConfig["trailingSlash"]
const pathPrefix = (process.env.PATH_PREFIX ||
  undefined) as GatsbyConfig["pathPrefix"]

// TODO: drop this hack
process.env.GATSBY_FUNCTIONS_PLATFORM = 'darwin';
process.env.GATSBY_FUNCTIONS_ARCH = 'arm64';

const adapter = netlifyAdapter({
  excludeDatastoreFromEngineFunction: false
});

const config: GatsbyConfig = {
  adapter,
  siteMetadata: {
    title,
    siteDescription,
  },
  trailingSlash,
  pathPrefix,
  plugins: [
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
  ],
  headers: [
    {
      source: `/*`,
      headers: [
        {
          key: "x-custom-header",
          value: "my custom header value",
        },
      ],
    },
    {
      source: `routes/ssr/*`,
      headers: [
        {
          key: "x-ssr-header",
          value: "my custom header value from config",
        },
        {
          key: "x-ssr-header-overwrite",
          value: "config wins",
        },
      ],
    },
    {
      source: `routes/dsg/*`,
      headers: [
        {
          key: "x-dsg-header",
          value: "my custom header value",
        },
      ],
    },
    {
      source: `routes/ssg/*`,
      headers: [
        {
          key: "x-ssg-header",
          value: "my custom header value",
        },
      ],
    },
  ],
}

export default config
