import { argv } from 'process'

import { run } from '../../lib/main.js'

const [, , file, args, options] = argv
const argsA = args === undefined ? [] : JSON.parse(args)
const optionsA = options === undefined ? options : JSON.parse(options)
run(file, argsA, optionsA)
