"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryGroupModel = void 0;
const mongoose_1 = require("mongoose");
const categoryGroupSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
    },
    color: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
    toJSON: {
        versionKey: false,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            delete ret._id;
            return ret;
        },
    },
});
exports.CategoryGroupModel = (0, mongoose_1.model)('CategoryGroup', categoryGroupSchema);
