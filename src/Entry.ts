
import Level from './Level';

/**
 * A log entry.
 *
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export interface Entry {
  /**
   * Timestamp of the log.
   */
  timestamp : number;
  /**
   * Name of the logger.
   */
  logger : string;
  /**
   * Log level.
   */
  level : Level;
  /**
   * Log message.
   */
  message : string;
  /**
   * Arbitrary object containing any additional information.
   * Can also be an instance of Error.
   */
  meta : Object;
}

export default Entry;

