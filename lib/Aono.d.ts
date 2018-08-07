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
    private highWaterMark;
    private handler;
    private pendingEntries;
    private handledEntries;
    private erroredEntries;
    private writeId;
    constructor(timeProvider: TimeProvider, highWaterMark?: number);
    addHandler(handler: Handler): this;
    getLogger(name: string): Logger<Level>;
    retry(): void;
    isSynced(): boolean;
    hasPending(): boolean;
    isWriting(): boolean;
    isErrored(): boolean;
    isAtWatermark(): boolean;
    private onLogEntry(entry);
    private preprocess(entry);
    private beginNextWrite();
    private onWriteSuccess();
    private onWriteError(error);
}
export default Aono;
