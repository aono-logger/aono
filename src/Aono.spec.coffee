sinon = require "sinon"
FakePromise = require "fake-promise"
  .default

Aono = require "./Aono"
  .default

TEST_HIGH_WATERMARK = 2

describe "Aono", ->
  mocks =
    timeProvider: sinon.stub()
    handler0:
      write: sinon.stub()
      highWaterMark: TEST_HIGH_WATERMARK
    handler1:
      write: sinon.stub()
      highWaterMark: TEST_HIGH_WATERMARK
    errorListener: sinon.spy()
    pressureListener: sinon.spy()
    syncListener: sinon.spy()

  testedFactory = null
  logger = null

  beforeEach ->
    testedFactory = new Aono mocks.timeProvider
    testedFactory.on "error", mocks.errorListener
    testedFactory.on "pressure", mocks.pressureListener
    testedFactory.on "sync", mocks.syncListener
    logger = testedFactory.getLogger "test"
  afterEach ->
    testedFactory.release()
    mocks.timeProvider.resetHistory()
    mocks.timeProvider.resetBehavior()
    mocks.handler0.write.reset()
    mocks.handler1.write.reset()
    mocks.errorListener.resetHistory()
    mocks.pressureListener.resetHistory()
    mocks.syncListener.resetHistory()

  describe "given no handlers", ->
    it "throws when trying to log", ->
      should -> logger.log "mayday", "we are blind"
        .throw "handler is not set"

  describe "given single handler", ->
    beforeEach ->
      testedFactory.addHandler "handler0", mocks.handler0

    describe "before any log entries", ->
      it "is synced", ->
        testedFactory.isSynced().should.equal true
      it "calling .retry throws", ->
        () -> testedFactory.retry()
          .should.throw ".retry() must be called only after 'error' is emitted"

    describe "when after first log entry", ->
      promise0 = null

      beforeEach ->
        mocks.timeProvider.returns 12345

        promise0 = new FakePromise
        mocks.handler0.write.returns promise0

        logger.log "info", "first entry"

      it "does not emit 'sync'", ->
        mocks.syncListener.should.have.callCount 0
      it "is not synced", ->
        testedFactory.isSynced().should.equal false

      it "immediately passes proper log entry to the handler", ->
        mocks.handler0.write.should.have.callCount 1
          .and.have.been.calledWith [
            timestamp: 12345
            logger: "test"
            level: "info"
            message: "first entry"
            data: {}
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

          mocks.handler0.write.reset()

          logger.log "debug", "second entry"
          logPromise = logger.log "warn", "entry", number: "three"
          undefined # not returning the promise

        it "is not synced", ->
          testedFactory.isSynced().should.equal false
        it "is pressured", ->
          testedFactory.isPressured().should.equal true
        it "does not emit 'sync'", ->
          mocks.syncListener.should.have.callCount 0
        it "does not pass second and third log entry to the handler", ->
          mocks.handler0.write.should.have.callCount 0
        it "emits \'pressure\' with proper writeId", ->
          mocks.pressureListener.should.have.callCount 1
            .and.have.been.calledWith "handler0", 1, 2

        describe "and after first write successfully ends", ->
          promise1 = null

          beforeEach ->
            mocks.handler0.write.reset()
            promise1 = new FakePromise
            mocks.handler0.write.returns promise1

            promise0.resolve()
            undefined # not returning the promise

          it "is not synced", ->
            testedFactory.isSynced().should.equal false
          it "is pressured", ->
            testedFactory.isPressured().should.equal true
          it "does not emit 'sync'", ->
            mocks.syncListener.should.have.callCount 0
          it "passes second and third log to the handler", ->
            mocks.handler0.write.should.have.callCount 1
              .and.have.been.calledWith  [{
                timestamp: 98765
                logger: "test"
                level: "debug"
                message: "second entry"
                data: {}
              }, {
                timestamp: 111111
                logger: "test"
                level: "warn"
                message: "entry"
                data: number: "three"
              }]

          describe "and after second write successfully ends", ->
            beforeEach ->
              mocks.handler0.write.reset()

              promise1.resolve()
              undefined # not returning the promise

            it "emits 'sync'", ->
              mocks.syncListener.should.have.callCount 1
                .and.have.been.calledWith "handler0"
            it "is synced", ->
              testedFactory.isSynced().should.equal true
            it "is not pressured", ->
              testedFactory.isPressured().should.equal false
            it "does not pass anything to the handler", ->
              mocks.handler0.write.should.have.callCount 0
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

              mocks.handler0.write.reset()
              mocks.pressureListener.resetHistory()
              mocks.syncListener.resetHistory()

              logger.log "doomsday", "message"
              logger.log "salvation", "all will be fine"
              undefined # not returning the promise

            it "is not synced", ->
              testedFactory.isSynced().should.equal false
            it "does not emit 'sync'", ->
              mocks.syncListener.should.have.callCount 0
            it "does not pass fouth and fifth log entry to the handler", ->
              mocks.handler0.write.should.have.callCount 0
            it "is pressured", ->
              testedFactory.isPressured().should.equal true
            it "does not emit \'pressure\'", ->
              mocks.pressureListener.should.have.callCount 0

      describe "and after first write successfully ends", ->
        promise1 = null

        beforeEach ->
          mocks.handler0.write.reset()

          promise1 = new FakePromise
          mocks.handler0.write.returns promise1

          promise0.resolve()
          undefined # not returning the promise

        it "is synced", ->
          testedFactory.isSynced().should.equal true
        it "emits 'sync'", ->
          mocks.syncListener.should.have.callCount 1
            .and.have.been.calledWith "handler0"
        it "calling .retry throws", ->
          () -> testedFactory.retry()
            .should.throw ".retry() must be called only after 'error' is emitted"

        describe "and after second log entry", ->
          beforeEach ->
            mocks.timeProvider.returns 98765

            mocks.handler0.write.resetHistory()
            mocks.syncListener.resetHistory()

            logger.log "debug", "entry", number: "two"
            undefined # not returning the promise

          it "is not synced", ->
            testedFactory.isSynced().should.equal false
          it "doesnt emit 'sync'", ->
            mocks.syncListener.should.have.callCount 0
          it "immediately passes second log entry to the handler", ->
            mocks.handler0.write.should.have.callCount 1
              .and.have.been.calledWith [
                timestamp: 98765
                logger: "test"
                level: "debug"
                message: "entry"
                data: number: "two"
              ]

      describe "and after first write fails", ->
        error = new Error "something went wrong"

        beforeEach ->
          promise0.reject error
          undefined # not returning the promise

        it "emits the error", ->
          mocks.errorListener.should.have.callCount 1
            .and.have.been.calledWith error, "handler0", 1
        it "is not synced", ->
          testedFactory.isSynced().should.equal false

        describe "and after second log entry", ->
          beforeEach ->
            mocks.timeProvider
              .resetHistory()
              .resetBehavior()
            mocks.timeProvider.returns 98765

            mocks.handler0.write.reset()

            logger.log "debug", "entry", number: "two"
            undefined # don't return promise

          it "does not pass second log entry to the handler", ->
            mocks.handler0.write.should.have.callCount 0

          describe "and after calling .retry", ->
            promise1 = null

            beforeEach ->
              mocks.handler0.write.reset()

              promise1 = new FakePromise
              mocks.handler0.write.returns promise1

              testedFactory.retry()

            it "immediately passes the first log entry to the handler", ->
              mocks.handler0.write.should.have.callCount 1
                .and.have.been.calledWith [
                  timestamp: 12345
                  logger: "test"
                  level: "info"
                  message: "first entry"
                  data: {}
                ]

    describe "when after log entry containing error as data", ->
      promise0 = null
      fakeError =
        name: "TestError"
        message: "error"
        stack: "a\nb\nc"

      beforeEach ->
        mocks.timeProvider.returns 12345

        promise0 = new FakePromise
        mocks.handler0.write.returns promise0

        logger.log "error", "error", fakeError
        undefined # not returning the promise

      it "passes entry with preprocessed error to handler", ->
        mocks.handler0.write.should.have.callCount 1
          .and.have.been.calledWith [
            timestamp: 12345
            logger: "test"
            level: "error"
            message: "error"
            data:
              stacktrace: [
                "a"
                "b"
                "c"
              ]
          ]

  describe "given two handlers", ->
    beforeEach ->
      testedFactory.addHandler "handler0", mocks.handler0
      testedFactory.addHandler "handler1", mocks.handler1

    describe "when after first log entry", ->
      promise0 = null
      promise1 = null

      entry0 =
        timestamp: 12345
        logger: "test"
        level: "info"
        message: "first entry"
        data: {}

      beforeEach ->
        mocks.timeProvider.returns 12345

        promise0 = new FakePromise
        mocks.handler0.write.returns promise0
        promise1 = new FakePromise
        mocks.handler1.write.returns promise1

        logger.log "info", "first entry"

      it "immediately passes proper log entry to first handler", ->
        mocks.handler0.write.should.have.callCount 1
          .and.have.been.calledWith [ entry0 ]
      it "immediately passes proper log entry to second handler", ->
        mocks.handler1.write.should.have.callCount 1
          .and.have.been.calledWith [ entry0 ]

      describe "and after write successfully ends in first handler", ->
        promise2 = null

        beforeEach ->
          mocks.handler0.write.reset()
          promise2 = new FakePromise
          mocks.handler0.write.returns promise2

          promise0.resolve()
          undefined # not returning the promise

        it "is not synced", ->
          testedFactory.isSynced().should.equal false
        it "emits 'sync' of first handler", ->
          mocks.syncListener.should.have.callCount 1
            .and.have.been.calledWith "handler0"

        describe "and after write successfully ends in second handler", ->
          promise3 = null

          beforeEach ->
            mocks.syncListener.resetHistory()

            mocks.handler1.write.reset()
            promise3 = new FakePromise
            mocks.handler1.write.returns promise3

            promise1.resolve()
            undefined # not returning the promise

          it "is synced", ->
            testedFactory.isSynced().should.equal true
          it "emits 'sync' of second handler", ->
            mocks.syncListener.should.have.callCount 1
              .and.have.been.calledWith "handler1"

        describe "when after second log entry", ->
          entry1 =
            timestamp: 98765
            logger: "test"
            level: "debug"
            message: "second entry"
            data: {}
          beforeEach ->
            mocks.timeProvider.returns 98765

            mocks.handler1.write.resetHistory()
            mocks.syncListener.resetHistory()

            logger.log "debug", "second entry"
            undefined # don't return promise

          it "immediately passes second entry to first handler", ->
            mocks.handler0.write.should.have.callCount 1
              .and.have.been.calledWith [ entry1 ]
          it "does not pass second entry to second handler", ->
            mocks.handler1.write.should.have.callCount 0

          it "is not synced", ->
            testedFactory.isSynced().should.equal false
          it "does not emit 'sync'", ->
            mocks.syncListener.should.have.callCount 0
          it "emits \'pressure\' for second handler", ->
            mocks.pressureListener.should.have.callCount 1
              .and.have.been.calledWith "handler1", 1, 2
          it "is pressured", ->
            testedFactory.isPressured().should.equal true

          describe "when after third log entry", ->
            entry2 =
              timestamp: 111111
              logger: "test"
              level: "warn"
              message: "entry"
              data: number: "three"

            beforeEach ->
              mocks.pressureListener.resetHistory()
              mocks.handler0.write.resetHistory()
              mocks.handler1.write.resetHistory()

              mocks.timeProvider.returns 111111

              logger.log "warn", "entry", number: "three"
              undefined # don't return promise

            it "does not pass second entry to first handler", ->
              mocks.handler0.write.should.have.callCount 0
            it "does not pass second entry to second handler", ->
              mocks.handler1.write.should.have.callCount 0

            it "is not synced", ->
              testedFactory.isSynced().should.equal false
            it "emits \'pressure\' for first handler", ->
              mocks.pressureListener.should.have.callCount 1
                .and.have.been.calledWith "handler0", 2, 2
            it "is pressured", ->
              testedFactory.isPressured().should.equal true

            describe "and after second write successfully ends in first handler", ->
              promise3 = null

              beforeEach ->
                mocks.handler0.write.reset()
                promise3 = new FakePromise
                mocks.handler0.write.returns promise3

                promise2.resolve()
                undefined # not returning the promise

              it "passes third entry to first handler", ->
                mocks.handler0.write.should.have.callCount 1
                  .and.have.been.calledWith [ entry2 ]

              it "is not synced", ->
                testedFactory.isSynced().should.equal false
              it "is pressured", ->
                testedFactory.isPressured().should.equal true

              describe "and after first write successfully ends in second handler", ->
                promise4 = null

                beforeEach ->
                  mocks.handler1.write.reset()
                  promise4 = new FakePromise
                  mocks.handler1.write.returns promise4

                  promise1.resolve()
                  undefined # not returning the promise

                it "passes second and third entries to second handler", ->
                  mocks.handler1.write.should.have.callCount 1
                    .and.have.been.calledWith [ entry1, entry2 ]

                it "is not synced", ->
                  testedFactory.isSynced().should.equal false
                it "is pressured", ->
                  testedFactory.isPressured().should.equal true

                describe "and writes in both handlers successfully ends", ->
                  beforeEach ->
                    mocks.syncListener.resetHistory();

                    promise3.resolve()
                    promise4.resolve()
                    undefined # not returning the promise

                  it "emits 2 'sync' events", ->
                    mocks.syncListener.should.have.callCount 2
                      .and.have.been.calledWith "handler0"
                      .and.have.been.calledWith "handler1"
                  it "is synced", ->
                    testedFactory.isSynced().should.equal true
                  it "is not pressured", ->
                    testedFactory.isPressured().should.equal false

