#!/usr/bin/env node

/*
 * This is a workaround for inconsistent support for importing JSON directly in
 * ts files.  Previously we used "import json from 'some.json'" but starting with
 * Node 16.5+ it requires an import assertion, which isn't fully supported in various
 * tools.  Instead of just copying the schema.json file like we used to, we now define
 * it as a plain schema.js file to make importing easier in the code, and then use
 * this script to convert it to a schema.json file at build time.
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve as resolvePath } from 'path'
import { fileURLToPath } from 'url'
import schema from '../src/check/check.schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const schemaDir = resolvePath(__dirname, '..', 'schema')
mkdirSync(schemaDir, { recursive: true })

const json = JSON.stringify(schema, null, 2)
const schemaFile = resolvePath(schemaDir, 'check.schema.json')
writeFileSync(schemaFile, json)
