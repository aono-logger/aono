sinon = require "sinon"
FakePromise = require "fake-promise"
  .default

Aono = require "./Aono"
  .default

TEST_HIGH_WATERMARK = 2

describe "Aono", ->
  mocks =
    timeProvider: sinon.stub()
    handler0: sinon.stub()
    handler1: sinon.stub()
    writeListener: sinon.spy()
    errorListener: sinon.spy()
    pressureListener: sinon.spy()

  testedFactory = null
  logger = null

  beforeEach ->
    testedFactory = new Aono mocks.timeProvider, TEST_HIGH_WATERMARK
    testedFactory.on "write", mocks.writeListener
    testedFactory.on "error", mocks.errorListener
    testedFactory.on "pressure", mocks.pressureListener
    logger = testedFactory.getLogger "test"
  afterEach ->
    mocks.timeProvider.resetHistory()
    mocks.timeProvider.resetBehavior()
    mocks.handler0.resetHistory()
    mocks.handler0.resetBehavior()
    mocks.handler1.resetHistory()
    mocks.handler1.resetBehavior()
    mocks.writeListener.resetHistory()
    mocks.errorListener.resetHistory()
    mocks.pressureListener.resetHistory()

  describe "given no handlers", ->
    it "logs without any problem", ->
      logger.log "mayday", "we are blind"

  describe "given single handler", ->
    beforeEach ->
      testedFactory.addHandler mocks.handler0

    describe "before any log entries", ->
      it "calling .retry throws", ->
        () -> testedFactory.retry()
          .should.throw ".retry() must be called only after emitting 'error'"

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

        it "does not pass second and third log entry to the handler", ->
          mocks.handler0.should.have.callCount 0
        it "emits \'pressure\' with proper writeId", ->
          mocks.pressureListener.should.have.callCount 1
            .and.have.been.calledWith 0

        describe "and after first write successfully ends", ->
          promise1 = null

          beforeEach ->
            mocks.handler0.resetBehavior()
            promise1 = new FakePromise
            mocks.handler0.returns promise1

            promise0.setResult undefined
              .resolve()
            undefined # not returning the promise

          it "emits 'write' with first log entry", ->
            mocks.writeListener.should.have.callCount 1
              .and.have.been.calledWith [
                timestamp: 12345
                logger: "test"
                level: "info"
                message: "first entry"
                meta: {}
              ]
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

          describe "and after second write successfully ends", ->
            beforeEach ->
              mocks.handler0.resetHistory()
              mocks.writeListener.resetHistory()

              promise1.setResult undefined
                .resolve()
              undefined # not returning the promise

            it "emits 'write' with second and third log entry", ->
              mocks.writeListener.should.have.callCount 1
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
            it "does not pass anything to the handler", ->
              mocks.handler0.should.have.callCount 0

          describe "and after fourth and fifth log entry", ->
            beforeEach ->
              mocks.timeProvider
                .resetHistory()
                .resetBehavior()
              mocks.timeProvider.onCall 0
                .returns 444444
              mocks.timeProvider.onCall 1
                .returns 555555

              mocks.handler0.resetHistory()
              mocks.pressureListener.resetHistory()

              logger.log "doomsday", "message"
              logger.log "salvation", "all will be fine"

            it "does not pass fouth and fifth log entry to the handler", ->
              mocks.handler0.should.have.callCount 0
            it "emits \'pressure\' with proper writeId", ->
              mocks.pressureListener.should.have.callCount 1
                .and.have.been.calledWith 1

      describe "and after first write successfully ends", ->
        promise1 = null

        beforeEach ->
          mocks.handler0.resetBehavior()
          promise1 = new FakePromise
          mocks.handler0.returns promise1

          promise0.setResult undefined
            .resolve()
          undefined # not returning the promise

        it "calling .retry throws", ->
          () -> testedFactory.retry()
            .should.throw ".retry() must be called only after emitting 'error'"

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

      describe "and after first write fails", ->
        error = new Error "something went wrong"

        beforeEach ->
          promise0
            .reject error
            .reject()
          undefined # not returning the promise

        it "emits the error", ->
          mocks.errorListener.should.have.callCount 1
            .and.have.been.calledWith error, [
              timestamp: 12345
              logger: "test"
              level: "info"
              message: "first entry"
              meta: {}
            ]

        describe "and after second log entry", ->
          beforeEach ->
            mocks.timeProvider
              .resetHistory()
              .resetBehavior()
            mocks.timeProvider.returns 98765

            mocks.handler0.resetHistory()

            logger.log "debug", "entry", number: "two"

          it "does not pass second log entry to the handler", ->
            mocks.handler0.should.have.callCount 0

          describe "and after calling .retry", ->
            promise1 = null

            beforeEach ->
              mocks.handler0.resetHistory()
              mocks.handler0.resetBehavior()

              promise1 = new FakePromise
              mocks.handler0.returns promise1

              testedFactory.retry()

            it "immediately passes the first log entry to the handler", ->
              mocks.handler0.should.have.callCount 1
                .and.have.been.calledWith [
                  timestamp: 12345
                  logger: "test"
                  level: "info"
                  message: "first entry"
                  meta: {}
                ]

