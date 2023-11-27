
import Handler from './Handler';
import Entry from './Entry';

const DEFAULT_HIGH_WATERMARK = 256;

/**
 * Asynchronuously writes log entries to a handler (used internally by Aono).
 *
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class LogStream {
  // New entries queued for next write
  private readonly pendingEntries : Entry[] = [];
  // Entries currently being written
  private readonly writtenEntries : Entry[] = [];
  // Entries from last failed write
  private readonly erroredEntries : Entry[] = [];

  // Incremented each time handler is invoked and sent as argument in 'pressure' event.
  // Can be used to identify consecutive back pressures in client code of this Aono instance.
  private _writeId = 0;

  constructor(
    private handler : Handler,
    private successCallback : () => void,
    private errorCallback : (error : Error) => void,
  ) {
    this.onWriteSuccess = this.onWriteSuccess.bind(this);
    this.onWriteError = this.onWriteError.bind(this);
  }

  /**
   * Adds given `entry` to queue, starts a write if not currently in progress.
   *
   * @return `true` iff `this.length` === `this.handler.highWaterMark`
   */
  write(entry : Entry) {
    const wasSynced = this.isSynced();

    this.pendingEntries.push(preprocess(entry));

    if (wasSynced) {
      this.maybeBeginNextWrite();
    }
  }

  /**
   * Retries write of errored entries.
   *
   * @pre last write resulted in an error (`this.isErrored() === true`)
   * @post `.retry` may not be called until next error
   */
  retry() {
    if (!this.isErrored()) {
      throw new Error('.retry() must be called only after emitting \'error\'');
    }
    this.maybeBeginNextWrite();
  }

  /**
   * @return `true` iff all log entries are written
   */
  isSynced() : boolean {
    return this.pendingEntries.length === 0 && this.writtenEntries.length === 0 && !this.isErrored();
  }

  /**
   * @return `true` iff sum of queued and written quantities are greater or equal to highWaterMark
   */
  isAtWatermark() {
    return this.length >= this.getHighWaterMark();
  }

  /**
   * @return `true` iff last write resulted in an error.
   */
  isErrored() {
    return this.erroredEntries.length !== 0;
  }

  /**
   * @return quantity of log entries that currently wait for or are currently being precessed.
   */
  get length() {
    return this.pendingEntries.length + this.writtenEntries.length;
  }

  /**
   * @return unique identified of current call to Handler.write(entries)
   */
  get writeId() {
    return this._writeId;
  }

  private maybeBeginNextWrite() {
    if (this.isSynced()) {
      return;
    }
    this._writeId += 1;

    if (this.isErrored()) {
      addAll(this.writtenEntries, takeAll(this.erroredEntries));
    } else {
      addAll(this.writtenEntries, takeAll(this.pendingEntries));
    }

    this.handler.write(this.writtenEntries)
      .then(this.onWriteSuccess)
      .catch(this.onWriteError)
    ;
  }

  private onWriteSuccess() {
    takeAll(this.writtenEntries);

    this.successCallback();
    this.maybeBeginNextWrite();
  }

  private onWriteError(error : any) {
    addAll(this.erroredEntries, takeAll(this.writtenEntries));
    this.errorCallback(error);
  }

  private getHighWaterMark() {
    return this.handler.highWaterMark || DEFAULT_HIGH_WATERMARK;
  }
}

export default LogStream;

function preprocess(entry : Entry) : Entry {
  const preprocessed = { ...entry, data: { ...entry.data } };

  const { name, message, stack, ...data } = entry.data as any;
  if (name && message && stack) {
    // An error was passed as data param.
    // It's better to convert it to a stacktrace.
    preprocessed.data = {
      ...data,
      stacktrace: stack.split('\n'),
    };
  }
  return preprocessed;
}

function takeAll(entries : Entry[]) {
  return entries.splice(0, entries.length);
}

function addAll(entries : Entry[], newEntries : Entry[]) {
  entries.splice(entries.length, 0, ...newEntries);
}

