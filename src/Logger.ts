import { EventEmitter } from 'events';

import Entry from './Entry';
import TimeProvider from './TimeProvider';

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Logger<Level> {
  private readonly emitter = new EventEmitter();

  constructor(
    private getTimestamp : TimeProvider,
    private name : string,
  ) {
  }

  log(level : Level, message : string, meta : Object = {}) {
    this.emitter.emit('log', {
      timestamp: this.getTimestamp(),
      logger: this.name,
      level: level.toString(),
      message,
      meta,
    });
  }

  // interface of EventEmitter, but typed

  on(eventName : 'log', listener : (entry : Entry) => void) : this {
    this.emitter.on(eventName as string, listener);
    return this;
  }
  removeListener(eventName : 'log', listener : (entry : Entry) => void) : this {
    this.emitter.removeListener(eventName as string, listener);
    return this;
  }
}

export default Logger;

