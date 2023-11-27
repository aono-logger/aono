
sinon = require "sinon"
FakePromise = require "fake-promise"
  .FakePromise

Logger = require "./Logger"
  .default

describe "Logger", ->
  logger0 = "logger0"

  mocks =
    timeProvider: sinon.stub()
    handle: sinon.stub()

  testedLogger = null
  log = null
  handlePromise = null

  beforeEach ->
    testedLogger = new Logger logger0, null, mocks.handle, mocks.timeProvider
    handlePromise = new FakePromise
    mocks.handle.returns handlePromise

  afterEach ->
    mocks.handle.resetHistory()
    mocks.timeProvider.resetHistory()

  describe "when after logging without data", ->
    level0 = "level0"
    message0 = "message0"

    logPromise = null

    beforeEach ->
      logPromise = testedLogger.log level0, message0
      log = (mocks.handle.getCall 0).args[0]

    it "emits log with proper logger name", ->
      log.logger.should.equal logger0
    it "emits log with proper level", ->
      log.level.should.equal level0
    it "emits log with proper message", ->
      log.message.should.equal message0
    it "emits log with empty data", ->
      log.data.should.eql {}

    describe "after resolving handlePromise", ->
      beforeEach ->
        handlePromise.resolve undefined
        undefined

      it "resolves logPromise", ->
        logPromise

  describe "when after logging with data", ->
    level1 = "level1"
    message1 = "message1"
    data0 = prop0: "value0"

    beforeEach ->
      testedLogger.log level1, message1, data0
      log = (mocks.handle.getCall 0).args[0]

    it "emits log with proper logger name", ->
      log.logger.should.equal logger0
    it "emits log with proper level", ->
      log.level.should.equal level1
    it "emits log with proper message", ->
      log.message.should.equal message1
    it "emits log with proper data", ->
      log.data.should.eql data0

