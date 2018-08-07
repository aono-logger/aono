/// <reference types="node" />
import { EventEmitter } from 'events';
import Entry from './Entry';
import TimeProvider from './TimeProvider';
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
export declare class Logger<Level> extends EventEmitter {
    private getTimestamp;
    private name;
    constructor(getTimestamp: TimeProvider, name: string);
    log(level: Level, message: string, meta?: Object): void;
    on(eventName: 'log', listener: (entry: Entry) => void): this;
    removeListener(eventName: 'log', listener: (entry: Entry) => void): this;
    emit(eventName: 'log', entry: Entry): boolean;
}
export default Logger;