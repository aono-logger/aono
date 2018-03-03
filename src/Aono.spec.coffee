sinon = require "sinon"
FakePromise = require "fake-promise"
  .default

Aono = require "./Aono"
  .default

describe "Aono", ->
  mocks =
    timeProvider: sinon.stub()
    handler0: sinon.stub()
    handler1: sinon.stub()

  testedFactory = null
  logger = null

  beforeEach ->
    testedFactory = new Aono mocks.timeProvider
    logger = testedFactory.getLogger "test"
  afterEach ->
    mocks.timeProvider.resetHistory()
    mocks.timeProvider.resetBehavior()
    mocks.handler0.resetHistory()
    mocks.handler0.resetBehavior()
    mocks.handler1.resetHistory()
    mocks.handler1.resetBehavior()

  describe "given no handlers", ->
    it "logs without any problem", ->
      logger.log "mayday", "we are blind"

  describe "given single handler", ->
    beforeEach ->
      testedFactory.addHandler mocks.handler0

    describe "when after first log entry", ->
      promise0 = null

      beforeEach ->
        mocks.timeProvider.returns 12345

        promise0 = new FakePromise
        mocks.handler0.returns promise0

        logger.log "info", "first entry"

      it "immediately passes proper log entry to the handler", ->
        mocks.handler0.should.have.callCount 1
          .and.have.been.calledWith [
            timestamp: 12345
            logger: "test"
            level: "info"
            message: "first entry"
            meta: {}
          ]

      describe "and after second and third log entry", ->
        beforeEach ->
          mocks.timeProvider
            .resetHistory()
            .resetBehavior()
          mocks.timeProvider.onCall 0
            .returns 98765
          mocks.timeProvider.onCall 1
            .returns 111111

          mocks.handler0.resetHistory()

          logger.log "debug", "second entry"
          logger.log "warn", "entry", number: "three"

        it "does not pass second log entry to the handler", ->
          mocks.handler0.should.have.callCount 0

        describe "and after first write ends", ->
          promise1 = null

          beforeEach ->
            mocks.handler0.resetBehavior()
            promise1 = new FakePromise
            mocks.handler0.returns promise1

            promise0.setResult undefined
              .resolve()
            undefined # not returning the promise

          it "passes second and third log to the handler", ->
            mocks.handler0.should.have.callCount 1
              .and.have.been.calledWith [{
                timestamp: 98765
                logger: "test"
                level: "debug"
                message: "second entry"
                meta: {}
              }, {
                timestamp: 111111
                logger: "test"
                level: "warn"
                message: "entry"
                meta: number: "three"
              }]

      describe "and after first write ends", ->
        promise1 = null

        beforeEach ->
          mocks.handler0.resetBehavior()
          promise1 = new FakePromise
          mocks.handler0.returns promise1

          promise0.setResult undefined
            .resolve()
          undefined # not returning the promise

        describe "and after second log entry", ->
          beforeEach ->
            mocks.timeProvider
              .resetHistory()
              .resetBehavior()
            mocks.timeProvider.returns 98765

            mocks.handler0.resetHistory()

            logger.log "debug", "entry", number: "two"

          it "immediately passes second log entry to the handler", ->
            mocks.handler0.should.have.callCount 1
              .and.have.been.calledWith [
                timestamp: 98765
                logger: "test"
                level: "debug"
                message: "entry"
                meta: number: "two"
              ]

