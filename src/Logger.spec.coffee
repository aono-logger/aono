
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
    testedLogger = new Logger logger0, mocks.handle, mocks.timeProvider
    handlePromise = new FakePromise
    mocks.handle.returns handlePromise

  afterEach ->
    mocks.handle.resetHistory()
    mocks.timeProvider.resetHistory()

  describe "when after logging without meta", ->
    timestamp0 = 123456
    level0 = "level0"
    message0 = "message0"

    logPromise = null

    beforeEach ->
      mocks.timeProvider.returns timestamp0

      logPromise = testedLogger.log level0, message0
      log = (mocks.handle.getCall 0).args[0]

    it "emits log with proper timestamp", ->
      log.timestamp.should.equal timestamp0
    it "emits log with proper logger name", ->
      log.logger.should.equal logger0
    it "emits log with proper level", ->
      log.level.should.equal level0
    it "emits log with proper message", ->
      log.message.should.equal message0
    it "emits log with empty meta", ->
      log.meta.should.eql {}

    describe "after resolving handlePromise", ->
      beforeEach ->
        handlePromise.resolve undefined
        undefined

      it "resolves logPromise", ->
        logPromise

  describe "when after logging with meta", ->
    timestamp1 = 789101112
    level1 = "level1"
    message1 = "message1"
    meta0 = prop0: "value0"

    beforeEach ->
      mocks.timeProvider.returns timestamp1

      testedLogger.log level1, message1, meta0
      log = (mocks.handle.getCall 0).args[0]

    it "emits log with proper timestamp", ->
      log.timestamp.should.equal timestamp1
    it "emits log with proper logger name", ->
      log.logger.should.equal logger0
    it "emits log with proper level", ->
      log.level.should.equal level1
    it "emits log with proper message", ->
      log.message.should.equal message1
    it "emits log with proper meta", ->
      log.meta.should.eql meta0

