
import Entry from './Entry';
import Level from './Level';

export interface LoggerParams {
  name : string;
  data : object | ((data: object) => object);
}

/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export class Logger {
  constructor(
    private readonly name : string,
    private readonly data : object,
    private readonly handle : (entry : Omit<Entry, "timestamp">) => Promise<void>,
  ) {
  }

  /**
   * Creates a child logger with new name and data.
   *
   * @param params new name and data for the logger
   */
  child({ name, data }: LoggerParams) : Logger {
    const initData = typeof data === "function"? data: (orig: object) => ({ ...orig, ...data })
    return new Logger(`${this.name} > ${name}`, initData(this.data), this.handle)
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
   * @param data log data
   * @return promise which will be resolved after back pressure is released
   */
  log(level : Level, message : string, data : Object = {}) : Promise<void> {
    return this.handle({
      logger: this.name,
      level,
      message,
      data: { ...this.data, ...data },
    });
  }

  /**
   * Logs message with 'trace' level.
   */
  trace(message : string, data : Object = {}) : Promise<void> {
    return this.log('trace', message, data);
  }

  /**
   * Logs message with 'debug' level.
   */
  debug(message : string, data : Object = {}) : Promise<void> {
    return this.log('debug', message, data);
  }

  /**
   * Logs message with 'info' level.
   */
  info(message : string, data : Object = {}) : Promise<void> {
    return this.log('info', message, data);
  }

  /**
   * Logs message with 'warn' level.
   */
  warn(message : string, data : Object = {}) : Promise<void> {
    return this.log('warn', message, data);
  }

  /**
   * Logs message with 'error' level.
   */
  error(message : string, data : Object) : Promise<void>;

  /**
   * Logs an error
   */
  error(error : Error) : Promise<void>;

  error(arg0 : string | Error, data : Object = {}) : Promise<void> {
    if (typeof arg0 === "string") {
      return this.log('error', arg0, data);
    } else {
      const message = arg0.message;
      const stackTrace = (arg0.stack || "").split("\n");
      return this.log('error', message, { stackTrace })
    }
  }
}

export default Logger;

