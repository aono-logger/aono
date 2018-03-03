import { EventEmitter } from 'events';

import Entry from './Entry';
import TimeProvider from './TimeProvider';

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Logger<Level> extends EventEmitter {
  constructor(
    private getTimestamp : TimeProvider,
    private name : string,
  ) {
    super();
  }

  log(level : Level, message : string, meta : Object = {}) {
    this.emit('log', {
      timestamp: this.getTimestamp(),
      logger: this.name,
      level: level.toString(),
      message,
      meta,
    });
  }

  // EventEmitter methods are redeclared to add type-safety.

  on(eventName : 'log', listener : (entry : Entry) => void) : this {
    return super.on(eventName as string, listener);
  }
  removeListener(eventName : 'log', listener : (entry : Entry) => void) : this {
    return super.removeListener(eventName as string, listener);
  }
  emit(eventName : 'log', entry : Entry) : boolean {
    return super.emit(eventName as string, entry);
  }
}

export default Logger;

