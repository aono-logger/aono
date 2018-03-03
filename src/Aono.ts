
import Logger from './Logger';
import Handler from './Handler';
import Entry from './Entry';
import TimeProvider from './TimeProvider';

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Aono<Level> {
  private handler : Handler | null = null;
  private pendingEntries : Entry[] = [];

  private state : 'idle' | 'writing'  = 'idle';

  constructor(
    private timeProvider : TimeProvider,
  ) {
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

  private onLogEntry(entry : Entry) {
    this.pendingEntries.push(entry);

    if (this.handler === null || this.state === 'writing') {
      return;
    }
    this.state = 'writing';
    this.beginNextWrite();
  }

  private beginNextWrite() {
    const write = this.handler as Handler;
    const entries = this.pendingEntries.splice(0, this.pendingEntries.length);

    write(entries)
      .then(this.onWriteSuccess)
      .catch(this.onWriteError)
    ;
  }

  private onWriteSuccess() {
    if (this.pendingEntries.length !== 0) {
      this.beginNextWrite();
      return;
    }
    this.state = 'idle';
  }

  private onWriteError(err : any) {
  }
}

export default Aono;

