
import { EventEmitter } from 'events';

import Logger from './Logger';
import Handler from './Handler';
import Entry from './Entry';

const DEFAULT_HIGH_WATERMARK = 256;

/**
 * Events emitted from instances `Aono`.
 *
 * Documented params are emitted with events (as extra arguments).
 */
export type EventName =
  /**
   * Emitted when the queue for log entries waining to be processed
   * receives first element after being empty.
   */
  'pending'
  /**
   * Emitted when sum of queued quantity and processed quantity
   * is greater or equal to highWaterMark.
   *
   * @param writeId ordinal number identifying a single write
   * @param queuedQuantity quantity of queued log entries
   */
  | 'pressure'
  /**
   * Emitted each time all requested log entries are writeen to the log
   * (queued quantity and handler quantity are zero).
   */
  | 'sync'
  /**
   * Emitted each time write fails.
   *
   * @param error error which cause the failure
   * @param erroredEntries entries which were not written to the log
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

  // New entries queued for next write
  private readonly pendingEntries : Entry[] = [];
  // Entries currently being written
  private readonly writtenEntries : Entry[] = [];
  // Entries from last failed write
  private readonly erroredEntries : Entry[] = [];
  // Function that resolve promises from calls to logger
  private readonly resolveCallbacks : (() => void)[] = [];

  private handler : Handler | null = null;
  // Incremented each time handler is invoked and sent as argument in 'pressure' event.
  // Can be used to identify consecutive back pressures in client code of this Aono instance.
  private writeId = 0;

  constructor(
    private getTimestamp : () => number,
    private highWaterMark : number = DEFAULT_HIGH_WATERMARK,
  ) {
    this.onLogEntry = this.onLogEntry.bind(this);
    this.addResolveCallback = this.addResolveCallback.bind(this);
    this.onWriteSuccess = this.onWriteSuccess.bind(this);
    this.onWriteError = this.onWriteError.bind(this);
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
   */
  addHandler(handler : Handler) : this {
    if (this.handler !== null) {
      throw new Error('support for multiple handlers is not implemented');
    }
    this.handler = handler;
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
    if (!this.isErrored()) {
      throw new Error('.retry() must be called only after emitting \'error\'');
    }
    addAll(this.writtenEntries, takeAll(this.erroredEntries));
    this.beginNextWrite();
  }

  /**
   * @return `true` iff all log entries are written
   */
  isSynced() : boolean {
    return !this.hasPending() && !this.isWriting() && !this.isErrored();
  }
  /**
   * @return `true` iff at least one entry waits to be processed after current write is finished
   */
  hasPending() {
    return this.pendingEntries.length !== 0;
  }
  /**
   * @return `true` iff at least one entry is currently being written
   */
  isWriting() {
    return this.writtenEntries.length !== 0;
  }
  /**
   * @return `true` iff last write resulted in an error
   */
  isErrored() {
    return this.erroredEntries.length !== 0;
  }
  /**
   * @return `true` iff sum of queued and written quantities are greater or equal to highWaterMark
   */
  isAtWatermark() {
    return (this.pendingEntries.length + this.writtenEntries.length) >= this.highWaterMark;
  }
  /**
   * @return quantity of log entrie that currently wait for processing or are currently being written
   */
  getQueueLength() {
    return this.pendingEntries.length + this.writtenEntries.length;
  }

  private onLogEntry(entry : Entry) : Promise<void> {
    if (this.isSynced()) {
      this.emitter.emit('pending');
    }
    const wasAtWatermark = this.isAtWatermark();
    this.pendingEntries.push(this.preprocess(entry));
    const isAtWatermark = this.isAtWatermark();

    if (!wasAtWatermark && isAtWatermark) {
      this.emitter.emit('pressure', this.writeId, this.getQueueLength());
    }

    if (!this.isWriting() && !this.isErrored()) {
      addAll(this.writtenEntries, takeAll(this.pendingEntries));
      this.beginNextWrite();
    }
    return isAtWatermark
      ? new Promise(this.addResolveCallback)
      : new SameTickPromise()
    ;
  }

  private preprocess(entry : Entry) : Entry {
    const processed = { ...entry, meta: { ...entry.meta } };

    const { name, message, stack, ...meta } = entry.meta;
    if (name && message && stack) {
      // An error was passed as meta param.
      // It's better to convert it to a stacktrace.
      processed.meta = {
        ...meta,
        stacktrace: stack.split('\n'),
      };
    }
    return processed;
  }

  private beginNextWrite() {
    this.writeId += 1;

    const handler = this.handler as Handler;
    if (!handler) {
      throw new Error('handler is not set');
    }

    handler.write(this.writtenEntries)
      .then(this.onWriteSuccess)
      .catch(this.onWriteError)
    ;
  }

  private onWriteSuccess() {
    takeAll(this.writtenEntries);

    if (!this.isAtWatermark()) {
      this.resolveCallbacks
        .splice(0, this.resolveCallbacks.length)
        .forEach(call => call());
    }
    if (!this.hasPending()) {
      this.emitter.emit('sync');
      return;
    }
    addAll(this.writtenEntries, takeAll(this.pendingEntries));
    this.beginNextWrite();
  }
  private onWriteError(error : any) {
    addAll(this.erroredEntries, takeAll(this.writtenEntries));
    this.emitter.emit('error', error, copy(this.erroredEntries));
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

function takeAll(entries : Entry[]) {
  return entries.splice(0, entries.length);
}

function addAll(entries : Entry[], newEntries : Entry[]) {
  entries.splice(entries.length, 0, ...newEntries);
}

function copy(entries : Entry[]) {
  return entries.concat([]);
}

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

