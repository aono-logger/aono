sinon = require "sinon"
FakePromise = require "fake-promise"
  .default

Aono = require "./Aono"
  .default

TEST_HIGH_WATERMARK = 2

describe "Aono", ->
  mocks =
    timeProvider: sinon.stub()
    handler0: handle: sinon.stub()
    pendingListener: sinon.spy()
    writeListener: sinon.spy()
    errorListener: sinon.spy()
    pressureListener: sinon.spy()
    syncListener: sinon.spy()

  testedFactory = null
  logger = null

  beforeEach ->
    testedFactory = new Aono mocks.timeProvider, TEST_HIGH_WATERMARK
    testedFactory.on "pending", mocks.pendingListener
    testedFactory.on "written", mocks.writeListener
    testedFactory.on "error", mocks.errorListener
    testedFactory.on "pressure", mocks.pressureListener
    testedFactory.on "sync", mocks.syncListener
    logger = testedFactory.getLogger "test"
  afterEach ->
    mocks.timeProvider.resetHistory()
    mocks.timeProvider.resetBehavior()
    mocks.handler0.handle.resetHistory()
    mocks.handler0.handle.resetBehavior()
    mocks.pendingListener.resetHistory()
    mocks.writeListener.resetHistory()
    mocks.errorListener.resetHistory()
    mocks.pressureListener.resetHistory()
    mocks.syncListener.resetHistory()

  describe "given no handlers", ->
    it "throws when trying to log", ->
      should -> logger.log "mayday", "we are blind"
        .throw "handler is not set"

  describe "given single handler", ->
    beforeEach ->
      testedFactory.addHandler mocks.handler0

    describe "before any log entries", ->
      it "is synced", ->
        testedFactory.isSynced().should.equal true
      it "calling .retry throws", ->
        () -> testedFactory.retry()
          .should.throw ".retry() must be called only after emitting 'error'"

    describe "when after first log entry", ->
      promise0 = null

      beforeEach ->
        mocks.timeProvider.returns 12345

        promise0 = new FakePromise
        mocks.handler0.handle.returns promise0

        logger.log "info", "first entry"

      it "is writing", ->
        testedFactory.isWriting().should.equal true
      it "emits 'pending'", ->
        mocks.pendingListener.should.have.callCount 1
      it "does not emit 'sync'", ->
        mocks.syncListener.should.have.callCount 0
      it "is not synced", ->
        testedFactory.isSynced().should.equal false

      it "immediately passes proper log entry to the handler", ->
        mocks.handler0.handle.should.have.callCount 1
          .and.have.been.calledWith [
            timestamp: 12345
            logger: "test"
            level: "info"
            message: "first entry"
            meta: {}
          ]

      describe "and after second and third log entry", ->
        logPromise = null

        beforeEach ->
          mocks.timeProvider
            .resetHistory()
            .resetBehavior()
          mocks.timeProvider.onCall 0
            .returns 98765
          mocks.timeProvider.onCall 1
            .returns 111111

          mocks.handler0.handle.resetHistory()
          mocks.pendingListener.resetHistory()

          logger.log "debug", "second entry"
          logPromise = logger.log "warn", "entry", number: "three"
          undefined # not returning the promise

        it "is not synced", ->
          testedFactory.isSynced().should.equal false
        it "is at watermark", ->
          testedFactory.isAtWatermark().should.equal true
        it "does not emit second 'pending'", ->
          mocks.pendingListener.should.have.callCount 0
        it "does not emit 'sync'", ->
          mocks.syncListener.should.have.callCount 0
        it "does not pass second and third log entry to the handler", ->
          mocks.handler0.handle.should.have.callCount 0
        it "emits \'pressure\' with proper writeId", ->
          mocks.pressureListener.should.have.callCount 1
            .and.have.been.calledWith 1, 1, 1

        describe "and after first write successfully ends", ->
          promise1 = null

          beforeEach ->
            mocks.handler0.handle.resetBehavior()
            promise1 = new FakePromise
            mocks.handler0.handle.returns promise1

            promise0.resolve()
            undefined # not returning the promise

          it "is not synced", ->
            testedFactory.isSynced().should.equal false
          it "is at watermark", ->
            testedFactory.isAtWatermark().should.equal true
          it "does not emit second 'pending'", ->
            mocks.pendingListener.should.have.callCount 0
          it "does not emit 'sync'", ->
            mocks.syncListener.should.have.callCount 0
          it "emits 'write' with first log entry", ->
            mocks.writeListener.should.have.callCount 1
              .and.have.been.calledWith 0, [
                timestamp: 12345
                logger: "test"
                level: "info"
                message: "first entry"
                meta: {}
              ]
          it "passes second and third log to the handler", ->
            mocks.handler0.handle.should.have.callCount 1
              .and.have.been.calledWith  [{
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
              mocks.handler0.handle.resetHistory()
              mocks.writeListener.resetHistory()

              promise1.resolve()
              undefined # not returning the promise

            it "does not emit second 'pending'", ->
              mocks.pendingListener.should.have.callCount 0
            it "emits 'sync'", ->
              mocks.syncListener.should.have.callCount 1
            it "is synced", ->
              testedFactory.isSynced().should.equal true
            it "is not at watermark", ->
              testedFactory.isAtWatermark().should.equal false
            it "emits 'write' with second and third log entry", ->
              mocks.writeListener.should.have.callCount 1
                .and.have.been.calledWith 1, [{
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
              mocks.handler0.handle.should.have.callCount 0
            it "resolves log promise", ->
              logPromise

          describe "and after fourth and fifth log entry", ->
            beforeEach ->
              mocks.timeProvider
                .resetHistory()
                .resetBehavior()
              mocks.timeProvider.onCall 0
                .returns 444444
              mocks.timeProvider.onCall 1
                .returns 555555

              mocks.handler0.handle.resetHistory()
              mocks.pressureListener.resetHistory()
              mocks.syncListener.resetHistory()

              logger.log "doomsday", "message"
              logger.log "salvation", "all will be fine"
              undefined # not returning the promise

            it "is not synced", ->
              testedFactory.isSynced().should.equal false
            it "does not emit 'sync'", ->
              mocks.syncListener.should.have.callCount 0
            it "emits 'pending'", ->
              mocks.pendingListener.should.have.callCount 0
            it "does not pass fouth and fifth log entry to the handler", ->
              mocks.handler0.handle.should.have.callCount 0
            it "is at watermark", ->
              testedFactory.isAtWatermark().should.equal true
            it "does not emit \'pressure\'", ->
              mocks.pressureListener.should.have.callCount 0

      describe "and after first write successfully ends", ->
        promise1 = null

        beforeEach ->
          mocks.handler0.handle.resetBehavior()
          mocks.pendingListener.resetHistory()

          promise1 = new FakePromise
          mocks.handler0.handle.returns promise1

          promise0.resolve()
          undefined # not returning the promise

        it "is synced", ->
          testedFactory.isSynced().should.equal true
        it "emits 'sync'", ->
          mocks.syncListener.should.have.callCount 1
        it "doesnt emit 'pending'", ->
          mocks.pendingListener.should.have.callCount 0
        it "calling .retry throws", ->
          () -> testedFactory.retry()
            .should.throw ".retry() must be called only after emitting 'error'"

        describe "and after second log entry", ->
          beforeEach ->
            mocks.timeProvider
              .resetHistory()
              .resetBehavior()
            mocks.timeProvider.returns 98765

            mocks.handler0.handle.resetHistory()
            mocks.syncListener.resetHistory()

            logger.log "debug", "entry", number: "two"
            undefined # not returning the promise

          it "is not synced", ->
            testedFactory.isSynced().should.equal false
          it "doesnt emit 'sync'", ->
            mocks.syncListener.should.have.callCount 0
          it "emits 'pending'", ->
            mocks.pendingListener.should.have.callCount 1
          it "immediately passes second log entry to the handler", ->
            mocks.handler0.handle.should.have.callCount 1
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
          promise0.reject error
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
        it "is not synced", ->
          testedFactory.isSynced().should.equal false

        describe "and after second log entry", ->
          beforeEach ->
            mocks.timeProvider
              .resetHistory()
              .resetBehavior()
            mocks.timeProvider.returns 98765

            mocks.handler0.handle.resetHistory()

            logger.log "debug", "entry", number: "two"

          it "does not pass second log entry to the handler", ->
            mocks.handler0.handle.should.have.callCount 0

          describe "and after calling .retry", ->
            promise1 = null

            beforeEach ->
              mocks.handler0.handle.resetHistory()
              mocks.handler0.handle.resetBehavior()

              promise1 = new FakePromise
              mocks.handler0.handle.returns promise1

              testedFactory.retry()

            it "immediately passes the first log entry to the handler", ->
              mocks.handler0.handle.should.have.callCount 1
                .and.have.been.calledWith [
                  timestamp: 12345
                  logger: "test"
                  level: "info"
                  message: "first entry"
                  meta: {}
                ]

    describe "when after log entry containing error as meta", ->
      promise0 = null
      fakeError =
        name: "TestError"
        message: "error"
        stack: "a\nb\nc"

      beforeEach ->
        mocks.timeProvider.returns 12345

        promise0 = new FakePromise
        mocks.handler0.handle.returns promise0

        logger.log "error", "error", fakeError
        undefined # not returning the promise

      it "passes entry with preprocessed error to handler", ->
        mocks.handler0.handle.should.have.callCount 1
          .and.have.been.calledWith [
            timestamp: 12345
            logger: "test"
            level: "error"
            message: "error"
            meta:
              stacktrace: [
                "a"
                "b"
                "c"
              ]
          ]

