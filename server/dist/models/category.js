"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryModel = void 0;
const mongoose_1 = require("mongoose");
const categorySchema = new mongoose_1.Schema({
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
    group: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'CategoryGroup',
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
exports.CategoryModel = (0, mongoose_1.model)('Category', categorySchema);
