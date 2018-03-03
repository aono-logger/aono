import Logger from './Logger';
import Handler from './Handler';
import TimeProvider from './TimeProvider';
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export declare class Aono<Level> {
    private timeProvider;
    private handler;
    private pendingEntries;
    private state;
    constructor(timeProvider: TimeProvider);
    addHandler(handler: Handler): this;
    getLogger(name: string): Logger<Level>;
    private onLogEntry(entry);
    private beginNextWrite();
    private onWriteSuccess();
    private onWriteError(err);
}
export default Aono;
