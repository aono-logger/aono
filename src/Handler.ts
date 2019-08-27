
import Entry from './Entry';

/**
 * Implements log IO operations.
 *
 * @author Maciej Chalapuk (maciej@chalapuk.pl)
 */
export interface Handler {
  /**
   * High water mark for 'backpressure' event emitted from Aono.
   *
   * @default 256
   */
  highWaterMark ?: number;

  /**
   * Writes given `entries` to the underlying backend,
   * resolves returned the promise afterwards.
   */
  write(entries: Entry[]) : Promise<void>;
}

export default Handler;

