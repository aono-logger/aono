sinon = require "sinon"

Logger = require "./Logger"
  .default

describe "Logger", ->
  logger0 = "logger0"

  mocks =
    timeProvider: sinon.stub()
    listener: sinon.spy()

  testedLogger = null
  log = null

  beforeEach ->
    testedLogger = new Logger mocks.timeProvider, logger0
    testedLogger.on "log", mocks.listener

  afterEach ->
    mocks.timeProvider.resetHistory()
    mocks.listener.resetHistory()

  describe "when after logging without meta", ->
    timestamp0 = 123456
    level0 = "level0"
    message0 = "message0"

    beforeEach ->
      mocks.timeProvider.returns timestamp0

      testedLogger.log level0, message0
      log = (mocks.listener.getCall 0).args[0]

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

  describe "when after logging with meta", ->
    timestamp1 = 789101112
    level1 = "level1"
    message1 = "message1"
    meta0 = prop0: "value0"

    beforeEach ->
      mocks.timeProvider.returns timestamp1

      testedLogger.log level1, message1, meta0
      log = (mocks.listener.getCall 0).args[0]

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

