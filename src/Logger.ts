
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

  /**
   * Logs given `message`.
   *
   * If aono is currently not backpressured and current call doesn't cause backpressure,
   * returned promise will be resolved immediately. Otherwise, the promise will be resolved
   * after back pressure is released.
   *
   * @param level log level
   * @param message log message
   * @param meta log data
   * @return promise which will be resolved after back pressure is released
   */
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

