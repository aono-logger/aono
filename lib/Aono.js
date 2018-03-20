"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var Logger_1 = require("./Logger");
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
var Aono = /** @class */ (function (_super) {
    __extends(Aono, _super);
    function Aono(timeProvider) {
        var _this = _super.call(this) || this;
        _this.timeProvider = timeProvider;
        _this.handler = null;
        // New entries queued for next write
        _this.pendingEntries = [];
        // Entries currently being written
        _this.handledEntries = [];
        // Entries from last failed write
        _this.erroredEntries = [];
        _this.onLogEntry = _this.onLogEntry.bind(_this);
        _this.onWriteSuccess = _this.onWriteSuccess.bind(_this);
        _this.onWriteError = _this.onWriteError.bind(_this);
        return _this;
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
    Aono.prototype.retry = function () {
        if (!this.isErrored()) {
            throw new Error('.retry() must be called only after emitting \'error\'');
        }
        this.handledEntries = takeAll(this.erroredEntries);
        this.beginNextWrite();
    };
    Aono.prototype.onLogEntry = function (entry) {
        this.pendingEntries.push(entry);
        if (this.handler === null || this.isWriting() || this.isErrored()) {
            return;
        }
        this.handledEntries = takeAll(this.pendingEntries);
        this.beginNextWrite();
    };
    Aono.prototype.beginNextWrite = function () {
        var write = this.handler;
        write(this.handledEntries)
            .then(this.onWriteSuccess)
            .catch(this.onWriteError);
    };
    Aono.prototype.onWriteSuccess = function () {
        this.emit('write', takeAll(this.handledEntries));
        if (this.pendingEntries.length === 0) {
            return;
        }
        this.handledEntries = takeAll(this.pendingEntries);
        this.beginNextWrite();
    };
    Aono.prototype.onWriteError = function (error) {
        this.erroredEntries = takeAll(this.handledEntries);
        this.emit('error', error, copy(this.erroredEntries));
    };
    Aono.prototype.isWriting = function () {
        return this.handledEntries.length !== 0;
    };
    Aono.prototype.isErrored = function () {
        return this.erroredEntries.length !== 0;
    };
    return Aono;
}(events_1.EventEmitter));
exports.Aono = Aono;
exports.default = Aono;
function takeAll(entries) {
    return entries.splice(0, entries.length);
}
function copy(entries) {
    return entries.concat([]);
}
