
import Entry from './Entry';

/**
 * Implements log IO operations.
 *
 * @author Maciej Chalapuk (maciej@chalapuk.pl)
 */
export interface Backend {
  /**
   * Writes given `entries` to the underlying backend,
   * resolves returned the promise afterwards.
   */
  write(entries: Entry[]) : Promise<void>;
}

export default Backend;

