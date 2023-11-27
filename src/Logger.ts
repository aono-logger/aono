
import Entry from './Entry';
import Level from './Level';

export interface LoggerParams {
  name : string;
  meta : object;
}

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Logger {
  constructor(
    private readonly name : string,
    private readonly meta : object,
    private readonly handle : (entry : Entry) => Promise<void>,
    private readonly getTimestamp : () => number,
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
      level,
      message,
      meta: { ...this.meta, ...meta },
    });
  }

  /**
   * Logs message with 'trace' level.
   */
  trace(message : string, meta : Object = {}) : Promise<void> {
    return this.log('trace', message, meta);
  }

  /**
   * Logs message with 'debug' level.
   */
  debug(message : string, meta : Object = {}) : Promise<void> {
    return this.log('debug', message, meta);
  }

  /**
   * Logs message with 'info' level.
   */
  info(message : string, meta : Object = {}) : Promise<void> {
    return this.log('info', message, meta);
  }

  /**
   * Logs message with 'warn' level.
   */
  warn(message : string, meta : Object = {}) : Promise<void> {
    return this.log('warn', message, meta);
  }

  /**
   * Logs message with 'error' level.
   */
  error(message : string, meta : Object = {}) : Promise<void> {
    return this.log('error', message, meta);
  }
}

export default Logger;

