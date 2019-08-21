
import Entry from './Entry';

/**
 * @author Maciej Chalapuk (maciej@chalapuk.pl)
 */
export interface Handler {
  /**
   * Writes given `entries` to the underlying backend,
   * resolves returned the promise afterwards.
   */
  handle(entries: Entry[]) : Promise<void>;
}

export default Handler;

