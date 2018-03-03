import { EventEmitter } from 'events';

import Entry from './Entry';

/**
 * @author Maciej Chalapuk (maciej@chalapuk.pl)
 */
export type Handler = (entries: Entry[]) => Promise<void>;

export default Handler;

