
import Entry from './Entry';
import TimeProvider from './TimeProvider';

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Logger<Level> {
  constructor(
    private readonly name : string,
    private readonly handle : (entry : Entry) => Promise<void>,
    private readonly getTimestamp : TimeProvider,
  ) {
  }

  log(level : Level, message : string, meta : Object = {}) : Promise<void> {
    return this.handle({
      timestamp: this.getTimestamp(),
      logger: this.name,
      level: level.toString(),
      message,
      meta,
    });
  }
}

export default Logger;

