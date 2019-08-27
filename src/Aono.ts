
import { EventEmitter } from 'events';

import Logger from './Logger';
import Handler from './Handler';
import Entry from './Entry';
import LogStream from './LogStream';

/**
 * Events emitted from instances `Aono`.
 *
 * Documented params are emitted with events (as extra arguments).
 */
export type EventName =
  /**
   * Emitted when sum of queued quantity and processed quantity
   * is greater or equal to highWaterMark.
   *
   * @param name name of handler on which back pressure is triggered
   * @param writeId ordinal number which identifies collection of entries passed to Handler.write(...)
   * @param length quantity of queued log entries
   */
  | 'pressure'
  /**
   * Emitted each time all requested log entries are successfully writeen to a handler
   * (queued of a handler becomes empty).
   *
   * @param name name of handler which became synced
   */
  | 'sync'
  /**
   * Emitted each time write fails.
   *
   * @param name name of handler which became synced
   * @param writeId ordinal number which identifies collection of entries passed to Handler.write(...)
   * @param error error which cause the failure
   */
  | 'error';

/**
 * Main class of Aono logger library.
 *
 * It's responsible for:
 *  * registering Handlers
 *  * creating Loggers
 *  * batching log entries between writes
 *  * emitting backpressure-related events
 *
 * Typically, a single instance of this class is created per a program.
 *
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Aono<Level extends string> {
  private readonly emitter = new EventEmitter();
  // Function that resolve promises from calls to logger
  private readonly resolveCallbacks : (() => void)[] = [];

  private handlerName : string | null = null;
  private stream : LogStream | null = null;

  constructor(
    private getTimestamp : () => number,
  ) {
    this.onLogEntry = this.onLogEntry.bind(this);
    this.addResolveCallback = this.addResolveCallback.bind(this);
  }

  // EventEmitter interface, but typed
  on(eventName : EventName, callback : () => void) : this {
    this.emitter.on(eventName, callback);
    return this;
  }
  once(eventName : EventName, callback : () => void) : this {
    this.emitter.once(eventName, callback);
    return this;
  }
  removeListener(eventName : EventName, callback : () => void) : this {
    this.emitter.removeListener(eventName, callback);
    return this;
  }

  /**
   * Adds given `handler` to Aono.
   *
   * @param name unique identifier of added handler
   * @param handler handler that will be added to this instance of Aono
   */
  addHandler(name : string, handler : Handler) : this {
    if (this.stream !== null) {
      throw new Error('support for multiple handlers is not implemented');
    }
    this.handlerName = name;
    this.stream = new LogStream(
      handler,
      this.onWriteSuccess.bind(this, name),
      this.onWriteError.bind(this, name)
    );
    return this;
  }

  /**
   * Creates and returns a new instance of `Logger` connected
   * with this Aono object and its handlers.
   *
   * @return new logger instance
   */
  getLogger(name : string) : Logger<Level> {
    return new Logger<Level>(name, this.onLogEntry, this.getTimestamp);
  }

  /**
   * Retries write of errored entries.
   *
   * @pre last write resulted in an error (`this.isErrored() === true`)
   * @post `.retry` may not be called until next error
   */
  retry() : void {
    if (!this.stream) {
      throw new Error('handler is not set');
    }
    this.stream.retry();
  }

  /**
   * @return `true` iff all log entries are written
   */
  isSynced() : boolean {
    if (!this.stream) {
      throw new Error('handler is not set');
    }
    return this.stream.isSynced();
  }
  /**
   * @return `true` iff last write resulted in an error
   */
  isErrored() {
    if (!this.stream) {
      throw new Error('handler is not set');
    }
    return this.stream.isErrored();
  }
  /**
   * @return `true` iff sum of queued and written quantities are greater or equal to highWaterMark
   */
  isAtWatermark() {
    if (!this.stream) {
      throw new Error('handler is not set');
    }
    return this.stream.isAtWatermark();
  }

  private onLogEntry(entry : Entry) : Promise<void> {
    if (!this.stream) {
      throw new Error('handler is not set');
    }
    const wasAtWatermark = this.stream.isAtWatermark();
    this.stream.write(entry);
    const isAtWatermark = this.stream.isAtWatermark();

    if (!wasAtWatermark && isAtWatermark) {
      this.emitter.emit('pressure', this.handlerName, this.stream.writeId, this.stream.length);
    }
    return isAtWatermark
      ? new Promise(this.addResolveCallback)
      : new SameTickPromise()
    ;
  }

  private onWriteSuccess(name : string) {
    if (!this.isAtWatermark()) {
      this.resolveCallbacks
        .splice(0, this.resolveCallbacks.length)
        .forEach(call => call());
    }
    if (this.isSynced()) {
      this.emitter.emit('sync', name);
    }
  }
  private onWriteError(name : string, error : any) {
    this.emitter.emit('error', this.handlerName, (this.stream as LogStream).writeId, error);
  }

  private addResolveCallback(callback : () => void) {
    if (this.isAtWatermark()) {
      this.resolveCallbacks.push(callback);
    } else {
      callback();
    }
  }
}

export default Aono;

class SameTickPromise implements Promise<void> {
  readonly [Symbol.toStringTag] : "Promise";

  then<TResult1 = void, TResult2 = never>(
    onfulfilled ?: ((result : void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected ?: ((reason : any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    if (onfulfilled) {
      onfulfilled.call(null);
    }
    return Promise.resolve<any>(null);
  }

  catch<TResult = never>(
    onrejected ?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): Promise<void | TResult> {
    return this.then<void, TResult>(null, onrejected);
  }

  finally(onfinally?: (() => void) | undefined | null) : Promise<void> {
    if (onfinally) {
      onfinally();
    }
    return Promise.resolve<any>(null);
  }
}

