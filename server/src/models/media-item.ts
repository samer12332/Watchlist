import { Schema, Types, model } from 'mongoose';

const mediaItemSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['movie', 'series'],
      required: true,
    },
    status: {
      type: String,
      enum: ['planned', 'watching', 'suspended', 'completed', 'reviewed'],
      required: true,
    },
    rating: {
      type: Number,
      default: null,
      min: 6.5,
      max: 10,
    },
    liked: {
      type: Boolean,
      default: null,
    },
    selectionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    notes: {
      type: String,
      default: null,
    },
    releaseYear: {
      type: Number,
      default: null,
    },
    posterUrl: {
      type: String,
      default: null,
    },
    totalSeasons: {
      type: Number,
      default: null,
    },
    totalEpisodes: {
      type: Number,
      default: null,
    },
    currentSeason: {
      type: Number,
      default: null,
    },
    currentEpisode: {
      type: Number,
      default: null,
    },
    categories: {
      type: [Schema.Types.ObjectId],
      ref: 'Category',
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

mediaItemSchema.path('totalSeasons').validate((value: number | null) => value === null || value >= 1);
mediaItemSchema.path('totalEpisodes').validate((value: number | null) => value === null || value >= 1);
mediaItemSchema.path('currentSeason').validate((value: number | null) => value === null || value >= 1);
mediaItemSchema.path('currentEpisode').validate((value: number | null) => value === null || value >= 1);

export const MediaItemModel = model('MediaItem', mediaItemSchema);
export const MediaObjectId = Types.ObjectId;
