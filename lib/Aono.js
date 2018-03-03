"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Logger_1 = require("./Logger");
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
var Aono = /** @class */ (function () {
    function Aono(timeProvider) {
        this.timeProvider = timeProvider;
        this.handler = null;
        this.pendingEntries = [];
        this.state = 'idle';
        this.onLogEntry = this.onLogEntry.bind(this);
        this.onWriteSuccess = this.onWriteSuccess.bind(this);
        this.onWriteError = this.onWriteError.bind(this);
    }
    Aono.prototype.addHandler = function (handler) {
        if (this.handler !== null) {
            throw new Error('support for multiple handlers is not implemented');
        }
        this.handler = handler;
        return this;
    };
    Aono.prototype.getLogger = function (name) {
        return new Logger_1.default(this.timeProvider, name).on('log', this.onLogEntry);
    };
    Aono.prototype.onLogEntry = function (entry) {
        this.pendingEntries.push(entry);
        if (this.handler === null || this.state === 'writing') {
            return;
        }
        this.state = 'writing';
        this.beginNextWrite();
    };
    Aono.prototype.beginNextWrite = function () {
        var write = this.handler;
        var entries = this.pendingEntries.splice(0, this.pendingEntries.length);
        write(entries)
            .then(this.onWriteSuccess)
            .catch(this.onWriteError);
    };
    Aono.prototype.onWriteSuccess = function () {
        if (this.pendingEntries.length !== 0) {
            this.beginNextWrite();
            return;
        }
        this.state = 'idle';
    };
    Aono.prototype.onWriteError = function (err) {
    };
    return Aono;
}());
exports.Aono = Aono;
exports.default = Aono;
