import Entry from './Entry';
/**
 * @author Maciej Chalapuk (maciej@chalapuk.pl)
 */
export declare type Handler = (entries: Entry[]) => Promise<void>;
export default Handler;
