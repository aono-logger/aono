/// <reference types="node" />
import { EventEmitter } from 'events';
import Logger from './Logger';
import Handler from './Handler';
import TimeProvider from './TimeProvider';
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export declare class Aono<Level> extends EventEmitter {
    private timeProvider;
    private handler;
    private pendingEntries;
    private handledEntries;
    private erroredEntries;
    constructor(timeProvider: TimeProvider);
    addHandler(handler: Handler): this;
    getLogger(name: string): Logger<Level>;
    retry(): void;
    private onLogEntry(entry);
    private beginNextWrite();
    private onWriteSuccess();
    private onWriteError(error);
    private hasPending();
    private isWriting();
    private isErrored();
}
export default Aono;
