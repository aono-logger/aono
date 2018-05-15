import { EventEmitter } from 'events';

import Entry from './Entry';

/**
 * @author Maciej Chalapuk (maciej@chalapuk.pl)
 */
export interface Handler {
  handle(entries: Entry[]) : Promise<void>;
}

export default Handler;

