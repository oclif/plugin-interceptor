import {Hook, Interfaces} from '@oclif/core'
import {env} from '@salesforce/kit'
import * as path from 'path'
import * as os from 'os'
import * as nock from 'nock'
import * as fsx from 'fs-extra'
import * as chalk from 'chalk'
import * as sinon from 'sinon'
import * as debugFn from 'debug'

const debug = debugFn('cli:interceptor')

let warn: (message?: any, ...optionalParams: any[]) => void

const getConfig = (options: Interfaces.Hooks['prerun']['options']) => {
  const outputDir = env.getString('INTERCEPTOR_OUTPUT_DIR', process.cwd())
  const fixtureName = env.getString('INTERCEPTOR_FIXTURE_NAME', options.Command.id)
  const fixtureDir = path.join(outputDir, 'nockFixtures', fixtureName)
  const fixtureFile = path.join(fixtureDir, 'fixture.json')

  const quiet = env.getBoolean('INTERCEPTOR_QUIET', false)
  // eslint-disable-next-line no-console
  warn = quiet ? () => null : console.warn

  const homeDir = env.getString('INTERCEPTOR_HOME_DIR')
  if (homeDir) {
    sinon.stub(os, 'homedir').returns(homeDir)
  }

  return {fixtureName, fixtureDir, fixtureFile, homeDir}
}

const hook: Hook<'prerun'> = async function (options) {
  const mode = env.getString('INTERCEPTOR_MODE', 'noop')

  if (mode === 'record') {
    const {fixtureName, fixtureDir, fixtureFile, homeDir} = getConfig(options)
    warn('\n************************************************************\n')
    warn(`     Recording http/s traffic for: ${fixtureName}`)

    // Create the fixture directory, if necessary, and delete any existing
    // fixture file or it will append additional recordings.
    fsx.ensureDirSync(fixtureDir)
    if (fsx.existsSync(fixtureFile)) {
      debug(`Deleting existing nock fixture file ${fixtureFile}`)
      fsx.unlinkSync(fixtureFile)
    }

    warn(`     Writing fixture to: ${fixtureDir}`)
    if (homeDir) {
      warn(`     homedir overridden to: ${homeDir}`)
    }
    warn('\n************************************************************\n')

    const writeLogToFile = (content: any) => {
      let fixtures = []
      if (fsx.existsSync(fixtureFile)) {
        fixtures = fsx.readJSONSync(fixtureFile, {})
      }

      // Replace any double-slash with a single-slash in request paths.
      // E.g., "//services/data" --> "/services/data"
      if (content.path && content.path.length > 0 && content.path.startsWith('//')) {
        const replacedPath = content.path.replace(/\/\//, '/')
        debug(`Before writing fixture, fixing double-slash in path: ${content.path} to: ${replacedPath}`)
        content.path = replacedPath
      }

      // Don't use large request bodies on POSTs for nock matching.  E.g., file upload.
      const postBodyMaxLength = parseInt(env.getString('INTERCEPTOR_MAX_POST_BODY', '0'), 10)
      if (content.method.toUpperCase() === 'POST' &&
          content.body &&
          content.body.length > postBodyMaxLength) {
        debug(`Not persisting content.body of length: ${content.body.length} from POST request`)
        delete content.body
      }

      fixtures.push(content)
      fsx.writeJSONSync(fixtureFile, fixtures, {spaces: 4})
    }

    nock.recorder.rec({
      output_objects: true,
      logging: writeLogToFile,
      use_separator: false,
    })
  } else if (mode === 'mock') {
    // Override all setTimeout calls to immediately execute the callback
    // so as not to have client code waiting.  E.g., for polling.
    if (env.getBoolean('INTERCEPTOR_DISABLE_TIMEOUTS', true)) {
      debug('Overriding global.setTimeout to execute the callback on next tick')
      const originalSetTimeout = global.setTimeout
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      global.setTimeout = cb => originalSetTimeout(cb, 0)
    }

    // Default to disallow any http/s request that's unmatched by nock.
    const disableNetConnect = env.getBoolean('INTERCEPTOR_DISABLE_NET_CONNECT', true)
    if (disableNetConnect) {
      debug('disabling all unexpected HTTPS requests')
      nock.disableNetConnect()
    }

    const {fixtureName, fixtureDir, fixtureFile, homeDir} = getConfig(options)
    warn('\n************************************************************\n')
    warn(`     Mocking http/s traffic for: ${fixtureName}`)
    warn(`     Using test fixtures from: ${fixtureDir}`)
    if (homeDir) {
      warn(`     homedir overridden to: ${homeDir}`)
    }
    if (disableNetConnect) {
      warn(chalk.default.yellowBright('\n     WARNING - ALL HTTP/S TRAFFIC IS BEING BLOCKED'))
    }
    warn('\n************************************************************\n')

    // Allow recorded nock scopes to be overridden
    const nockScopeOverride = env.getString('INTERCEPTOR_SCOPE_OVERRIDE')

    const nockDefs = nock.loadDefs(fixtureFile)
    if (nockScopeOverride) {
      debug(`Overriding the recorded nock scope with: ${nockScopeOverride}`)
      nockDefs.forEach(def => {
        def.scope = nockScopeOverride
      })
    }

    // Load the nocks from pre-processed definitions.
    const nocks = nock.define(nockDefs)

    // Fix double-slashes on incoming paths
    nocks.forEach(function (aNock) {
      const _nock: any = aNock
      _nock.transformPathFunction = (incomingPath: string) => {
        let replacedPath: string | null = null
        if (incomingPath.startsWith('//')) {
          replacedPath = incomingPath.replace(/\/\//, '/')
          debug(`Before fixture matching, fixing double-slash in incoming path: ${incomingPath} to: ${replacedPath}`)
        }
        return replacedPath || incomingPath
      }
    })
  }
}

export default hook
