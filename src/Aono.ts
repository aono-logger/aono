import { EventEmitter } from 'events';

import Logger from './Logger';
import Handler from './Handler';
import Entry from './Entry';
import TimeProvider from './TimeProvider';

const DEFAULT_HIGH_WATERMARK = 256;

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Aono<Level> extends EventEmitter {
  private handler : Handler | null = null;

  // New entries queued for next write
  private pendingEntries : Entry[] = [];
  // Entries currently being written
  private handledEntries : Entry[] = [];
  // Entries from last failed write
  private erroredEntries : Entry[] = [];

  // Incremented each time handler is invoked and sent as argument in 'pressure' event.
  // Can be used to identify consecutive back pressures in client code of this Aono instance.
  private writeId = -1;

  constructor(
    private timeProvider : TimeProvider,
    private highWaterMark : number = DEFAULT_HIGH_WATERMARK,
  ) {
    super();

    this.onLogEntry = this.onLogEntry.bind(this);
    this.onWriteSuccess = this.onWriteSuccess.bind(this);
    this.onWriteError = this.onWriteError.bind(this);
  }

  addHandler(handler : Handler) : this {
    if (this.handler !== null) {
      throw new Error('support for multiple handlers is not implemented');
    }
    this.handler = handler;
    return this;
  }

  getLogger(name : string) : Logger<Level> {
    return new Logger<Level>(this.timeProvider, name).on('log', this.onLogEntry);
  }

  retry() : void {
    if (!this.isErrored()) {
      throw new Error('.retry() must be called only after emitting \'error\'');
    }
    this.handledEntries = takeAll(this.erroredEntries);
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
    return this.pendingEntries.length === this.highWaterMark;
  }

  private onLogEntry(entry : Entry) {
    if (this.isSynced()) {
      this.emit('pending');
    }
    this.pendingEntries.push(this.preprocess(entry));

    if (this.isAtWatermark()) {
      this.emit('pressure', this.writeId);
    }
    if (this.handler === null || this.isWriting() || this.isErrored()) {
      return;
    }
    this.handledEntries = takeAll(this.pendingEntries);
    this.beginNextWrite();
  }

  private preprocess(entry : Entry) : Entry {
    const processed = { ...entry, meta: { ...entry.meta } };
    if (entry.meta.name && entry.meta.message && entry.meta.stack) {
      // An error was passed as meta param.
      // It's better to convert it to a stacktrace.
      processed.meta = {
        stacktrace: entry.meta.stack.split('\n'),
      };
    }
    return processed;
  }

  private beginNextWrite() {
    const handler = this.handler as Handler;

    this.writeId += 1;

    handler.handle(this.handledEntries)
      .then(this.onWriteSuccess)
      .catch(this.onWriteError)
    ;
  }

  private onWriteSuccess() {
    this.emit('write', takeAll(this.handledEntries));

    if (!this.hasPending()) {
      this.emit('sync');
      return;
    }
    this.handledEntries = takeAll(this.pendingEntries);
    this.beginNextWrite();
  }
  private onWriteError(error : any) {
    this.erroredEntries = takeAll(this.handledEntries);
    this.emit('error', error, copy(this.erroredEntries));
  }
}

export default Aono;

function takeAll(entries : Entry[]) {
  return entries.splice(0, entries.length);
}

function copy(entries : Entry[]) {
  return entries.concat([]);
}
