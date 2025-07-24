import { existsSync } from 'fs'

import { installFunctionDependencies } from '../../install/functions.js'

// Plugin to package Netlify functions with @netlify/zip-it-and-ship-it
export const onPreBuild = async function ({ constants: { FUNCTIONS_SRC, IS_LOCAL } }) {
  if (!existsSync(FUNCTIONS_SRC)) {
    return {}
  }

  await installFunctionDependencies(FUNCTIONS_SRC, IS_LOCAL)
  return {}
}
