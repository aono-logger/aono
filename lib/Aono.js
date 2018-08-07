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
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var Logger_1 = require("./Logger");
var DEFAULT_HIGH_WATERMARK = 256;
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
var Aono = /** @class */ (function (_super) {
    __extends(Aono, _super);
    function Aono(timeProvider, highWaterMark) {
        if (highWaterMark === void 0) { highWaterMark = DEFAULT_HIGH_WATERMARK; }
        var _this = _super.call(this) || this;
        _this.timeProvider = timeProvider;
        _this.highWaterMark = highWaterMark;
        _this.handler = null;
        // New entries queued for next write
        _this.pendingEntries = [];
        // Entries currently being written
        _this.handledEntries = [];
        // Entries from last failed write
        _this.erroredEntries = [];
        // Incremented each time handler is invoked and sent as argument in 'pressure' event.
        // Can be used to identify consecutive back pressures in client code of this Aono instance.
        _this.writeId = -1;
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
    Aono.prototype.isSynced = function () {
        return !this.hasPending() && !this.isWriting() && !this.isErrored();
    };
    Aono.prototype.hasPending = function () {
        return this.pendingEntries.length !== 0;
    };
    Aono.prototype.isWriting = function () {
        return this.handledEntries.length !== 0;
    };
    Aono.prototype.isErrored = function () {
        return this.erroredEntries.length !== 0;
    };
    Aono.prototype.isAtWatermark = function () {
        return this.pendingEntries.length === this.highWaterMark;
    };
    Aono.prototype.onLogEntry = function (entry) {
        if (this.isSynced()) {
            this.emit('pending');
        }
        this.pendingEntries.push(this.preprocess(entry));
        if (this.isAtWatermark()) {
            this.emit('pressure', this.writeId);
        }
        if (this.handler === null || this.isWriting() || this.isErrored()) {
            return;
        }
        this.handledEntries = takeAll(this.pendingEntries);
        this.beginNextWrite();
    };
    Aono.prototype.preprocess = function (entry) {
        var processed = __assign({}, entry, { meta: __assign({}, entry.meta) });
        if (entry.meta.name && entry.meta.message && entry.meta.stack) {
            // An error was passed as meta param.
            // It's better to convert it to a stacktrace.
            processed.meta = {
                stacktrace: entry.meta.stack.split('\n'),
            };
        }
        return processed;
    };
    Aono.prototype.beginNextWrite = function () {
        var handler = this.handler;
        this.writeId += 1;
        handler.handle(this.handledEntries)
            .then(this.onWriteSuccess)
            .catch(this.onWriteError);
    };
    Aono.prototype.onWriteSuccess = function () {
        this.emit('write', takeAll(this.handledEntries));
        if (!this.hasPending()) {
            this.emit('sync');
            return;
        }
        this.handledEntries = takeAll(this.pendingEntries);
        this.beginNextWrite();
    };
    Aono.prototype.onWriteError = function (error) {
        this.erroredEntries = takeAll(this.handledEntries);
        this.emit('error', error, copy(this.erroredEntries));
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
//# sourceMappingURL=Aono.js.map