import {expect} from 'chai'
import * as sinon from 'sinon'
import {Hook, Interfaces} from '@oclif/core'
import {stubInterface, stubObject} from '@salesforce/ts-sinon'
import {env} from '@salesforce/kit'
import hook from '../../src/hooks/interceptor'
import * as nock from 'nock'
import * as fsx from 'fs-extra'
import * as path from 'path'

const sandbox = sinon.createSandbox()

describe('interceptor hook', () => {
  let nockRecordStub: sinon.SinonStub
  let nockLoadDefsStub: sinon.SinonStub
  let nockDefineStub: sinon.SinonStub
  let nockDisableNetConnectSpy: sinon.SinonSpy
  let ensureDirStub: sinon.SinonStub
  let existsStub: sinon.SinonStub
  let writeJSONStub: sinon.SinonStub

  const context = stubInterface<Hook.Context>(sandbox)
  const config = stubInterface<Interfaces.Config>(sandbox)
  const cmdId = 'interceptor:test'
  const cmd = stubObject<Interfaces.Command>(sandbox, {
    id: cmdId,
    hidden: false,
    aliases: [],
    flags: {},
    args: [],
    strict: false,
  })
  const testScope = 'https://my.test.domain:443'
  const testPath = '//services/data'
  const convertedTestPath = '/services/data'

  const _env = process.env

  let nockDef: any

  beforeEach(() => {
    nockRecordStub = sandbox.stub(nock.recorder, 'rec').callsFake((config: any) => {
      const requestContent = {
        scope: testScope,
        method: 'POST',
        path: testPath,
        body: 'somebodycontent',
      }
      // call the logging function with test input
      config.logging(requestContent)
      expect(config.output_objects).to.be.true
      expect(config.use_separator).to.be.false
      expect(requestContent).to.not.have.property('body')
      expect(requestContent).to.have.property('path', convertedTestPath)
    })
    nockDisableNetConnectSpy = sandbox.spy(nock, 'disableNetConnect')
    nockLoadDefsStub = sandbox.stub(nock, 'loadDefs').returns([{
      scope: testScope,
      path: '',
    }])
    nockDef = {}
    nockDefineStub = sandbox.stub(nock, 'define').returns([nockDef])
    sandbox.stub(console, 'warn')
    ensureDirStub = sandbox.stub(fsx, 'ensureDirSync')
    existsStub = sandbox.stub(fsx, 'existsSync')
    sandbox.stub(fsx, 'unlinkSync')
    sandbox.stub(fsx, 'readJSONSync')
    writeJSONStub = sandbox.stub(fsx, 'writeJSONSync')
  })

  afterEach(() => {
    sandbox.restore()
  })

  after(() => {
    process.env = _env
  })

  it('should do nothing when INTERCEPTOR_MODE is not set to "record" or "mock"', async () => {
    env.setString('INTERCEPTOR_MODE', 'noop')
    await hook.call(context, {Command: cmd as any, argv: [''], config})
    expect(nockRecordStub.called).to.be.false
    expect(nockLoadDefsStub.called).to.be.false
    expect(ensureDirStub.called).to.be.false
    expect(writeJSONStub.called).to.be.false
  })

  it('should record and write an http request when INTERCEPTOR_MODE is set to "record"', async () => {
    env.setString('INTERCEPTOR_MODE', 'record')
    existsStub.returns(false)

    await hook.call(context, {Command: cmd as any, argv: [''], config})

    expect(nockRecordStub.callCount).to.equal(1)
    expect(nockLoadDefsStub.callCount).to.equal(0)
    expect(nockDisableNetConnectSpy.called).to.be.false
    expect(ensureDirStub.callCount).to.equal(1)
    const fixtureDir = path.join(process.cwd(), 'nockFixtures', cmdId)
    expect(ensureDirStub.calledWith(fixtureDir)).to.be.true
    expect(existsStub.callCount).to.equal(2)
    const fixtureFile = path.join(fixtureDir, 'fixture.json')
    expect(existsStub.calledWith(fixtureFile)).to.be.true
    expect(writeJSONStub.called).to.be.true
  })

  it('should use recorded request when INTERCEPTOR_MODE is set to "mock"', async () => {
    env.setString('INTERCEPTOR_MODE', 'mock')
    existsStub.returns(false)

    await hook.call(context, {Command: cmd as any, argv: [''], config})

    expect(nockRecordStub.callCount).to.equal(0)
    expect(nockLoadDefsStub.callCount).to.equal(1)
    const fixtureFile = path.join(process.cwd(), 'nockFixtures', cmdId, 'fixture.json')
    expect(nockLoadDefsStub.calledWith(fixtureFile)).to.be.true
    expect(nockDisableNetConnectSpy.called).to.be.true
    expect(nockDefineStub.called).to.be.true
    expect(ensureDirStub.callCount).to.equal(0)
    expect(existsStub.callCount).to.equal(0)
    expect(writeJSONStub.called).to.be.false
    expect(nockDefineStub.args[0][0][0]).to.have.property('scope', testScope)
    expect(nockDef).to.have.property('transformPathFunction')
    expect(nockDef.transformPathFunction(testPath)).to.equal(convertedTestPath)
  })

  it('should override the definition scope when INTERCEPTOR_SCOPE_OVERRIDE=true', async () => {
    const overriddenScope = 'overridden scope'
    env.setString('INTERCEPTOR_MODE', 'mock')
    env.setString('INTERCEPTOR_SCOPE_OVERRIDE', overriddenScope)
    existsStub.returns(false)

    await hook.call(context, {Command: cmd as any, argv: [''], config})

    expect(nockRecordStub.callCount).to.equal(0)
    expect(nockLoadDefsStub.callCount).to.equal(1)
    const fixtureFile = path.join(process.cwd(), 'nockFixtures', cmdId, 'fixture.json')
    expect(nockLoadDefsStub.calledWith(fixtureFile)).to.be.true
    expect(nockDisableNetConnectSpy.called).to.be.true
    expect(nockDefineStub.called).to.be.true
    expect(ensureDirStub.callCount).to.equal(0)
    expect(existsStub.callCount).to.equal(0)
    expect(writeJSONStub.called).to.be.false
    expect(nockDefineStub.args[0][0][0]).to.have.property('scope', overriddenScope)
    expect(nockDef).to.have.property('transformPathFunction')
    expect(nockDef.transformPathFunction(testPath)).to.equal(convertedTestPath)
  })
})
