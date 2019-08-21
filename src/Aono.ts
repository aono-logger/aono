
import { EventEmitter } from 'events';

import Logger from './Logger';
import Handler from './Handler';
import Entry from './Entry';
import TimeProvider from './TimeProvider';

const DEFAULT_HIGH_WATERMARK = 256;

export type EventName = 'pending' | 'pressure' | 'write' | 'sync' | 'error';

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Aono<Level> {
  private readonly emitter = new EventEmitter();

  // New entries queued for next write
  private readonly pendingEntries : Entry[] = [];
  // Entries currently being written
  private readonly handledEntries : Entry[] = [];
  // Entries from last failed write
  private readonly erroredEntries : Entry[] = [];
  // Function that resolve promises from calls to logger
  private readonly resolveCallbacks : (() => void)[] = [];

  private handler : Handler | null = null;
  // Incremented each time handler is invoked and sent as argument in 'pressure' event.
  // Can be used to identify consecutive back pressures in client code of this Aono instance.
  private writeId = -1;

  constructor(
    private timeProvider : TimeProvider,
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

  addHandler(handler : Handler) : this {
    if (this.handler !== null) {
      throw new Error('support for multiple handlers is not implemented');
    }
    this.handler = handler;
    return this;
  }

  getLogger(name : string) : Logger<Level> {
    return new Logger<Level>(name, this.onLogEntry, this.timeProvider);
  }

  retry() : void {
    if (!this.isErrored()) {
      throw new Error('.retry() must be called only after emitting \'error\'');
    }
    addAll(this.handledEntries, takeAll(this.erroredEntries));
    this.beginNextWrite();
  }

  isSynced() : boolean {
    return !this.hasPending() && !this.isWriting() && !this.isErrored();
  }

  hasPending() {
    return this.pendingEntries.length !== 0;
  }
  isWriting() {
    return this.handledEntries.length !== 0;
  }
  isErrored() {
    return this.erroredEntries.length !== 0;
  }
  isAtWatermark() {
    return (this.pendingEntries.length + this.handledEntries.length) >= this.highWaterMark;
  }

  private onLogEntry(entry : Entry) : Promise<void> {
    if (this.isSynced()) {
      this.emitter.emit('pending');
    }
    const wasAtWatermark = this.isAtWatermark();
    this.pendingEntries.push(this.preprocess(entry));
    const isAtWatermark = this.isAtWatermark();

    if (!wasAtWatermark && isAtWatermark) {
      this.emitter.emit('pressure', this.writeId);
    }

    if (!this.isWriting() && !this.isErrored()) {
      addAll(this.handledEntries, takeAll(this.pendingEntries));
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
    const handler = this.handler as Handler;

    this.writeId += 1;

    if (!handler) {
      throw new Error('handler is not set');
    }
    handler.handle(this.handledEntries)
      .then(this.onWriteSuccess)
      .catch(this.onWriteError)
    ;
  }

  private onWriteSuccess() {
    this.emitter.emit('write', takeAll(this.handledEntries));

    if (!this.isAtWatermark()) {
      this.resolveCallbacks
        .splice(0, this.resolveCallbacks.length)
        .forEach(call => call());
    }
    if (!this.hasPending()) {
      this.emitter.emit('sync');
      return;
    }
    addAll(this.handledEntries, takeAll(this.pendingEntries));
    this.beginNextWrite();
  }
  private onWriteError(error : any) {
    addAll(this.erroredEntries, takeAll(this.handledEntries));
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
}

