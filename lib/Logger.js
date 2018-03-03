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
/**
 * @author Maciej Chałapuk (maciej@chalapuk.pl)
 */
var Logger = /** @class */ (function (_super) {
    __extends(Logger, _super);
    function Logger(getTimestamp, name) {
        var _this = _super.call(this) || this;
        _this.getTimestamp = getTimestamp;
        _this.name = name;
        return _this;
    }
    Logger.prototype.log = function (level, message, meta) {
        if (meta === void 0) { meta = {}; }
        this.emit('log', {
            timestamp: this.getTimestamp(),
            logger: this.name,
            level: level.toString(),
            message: message,
            meta: meta,
        });
    };
    // EventEmitter methods are redeclared to add type-safety.
    Logger.prototype.on = function (eventName, listener) {
        return _super.prototype.on.call(this, eventName, listener);
    };
    Logger.prototype.removeListener = function (eventName, listener) {
        return _super.prototype.removeListener.call(this, eventName, listener);
    };
    Logger.prototype.emit = function (eventName, entry) {
        return _super.prototype.emit.call(this, eventName, entry);
    };
    return Logger;
}(events_1.EventEmitter));
exports.Logger = Logger;
exports.default = Logger;
