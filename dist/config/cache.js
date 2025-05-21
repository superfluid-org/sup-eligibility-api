"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oneWeekCache = exports.halfDayCache = void 0;
const expiry_map_1 = __importDefault(require("expiry-map"));
exports.halfDayCache = new expiry_map_1.default(1000 * 60 * 60 * 12);
exports.oneWeekCache = new expiry_map_1.default(1000 * 60 * 60 * 24 * 7);
//# sourceMappingURL=cache.js.map