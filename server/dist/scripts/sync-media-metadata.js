"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../lib/db");
const external_metadata_1 = require("../lib/external-metadata");
const media_item_1 = require("../models/media-item");
const run = async () => {
    if (!(0, external_metadata_1.hasExternalMetadataConfig)()) {
        throw new Error('Missing OMDB_API_KEY or TMDB_READ_ACCESS_TOKEN.');
    }
    await (0, db_1.connectToDatabase)();
    const mediaItems = (await media_item_1.MediaItemModel.find({}));
    let updated = 0;
    let matched = 0;
    for (const mediaItem of mediaItems) {
        const external = await (0, external_metadata_1.fetchExternalMetadata)({
            title: mediaItem.title,
            type: mediaItem.type,
            releaseYear: mediaItem.releaseYear,
        });
        if (!external) {
            continue;
        }
        matched += 1;
        const merged = (0, external_metadata_1.mergeExternalMetadata)({
            rating: mediaItem.rating,
            releaseYear: mediaItem.releaseYear,
            posterUrl: mediaItem.posterUrl,
            totalSeasons: mediaItem.totalSeasons,
            totalEpisodes: mediaItem.totalEpisodes,
        }, external, { force: true });
        const changed = merged.rating !== mediaItem.rating ||
            merged.releaseYear !== mediaItem.releaseYear ||
            merged.posterUrl !== mediaItem.posterUrl ||
            merged.totalSeasons !== mediaItem.totalSeasons ||
            merged.totalEpisodes !== mediaItem.totalEpisodes;
        if (!changed) {
            continue;
        }
        mediaItem.rating = merged.rating;
        mediaItem.releaseYear = merged.releaseYear;
        mediaItem.posterUrl = merged.posterUrl;
        mediaItem.totalSeasons = merged.totalSeasons;
        mediaItem.totalEpisodes = merged.totalEpisodes;
        await mediaItem.save();
        updated += 1;
    }
    console.log(`Checked ${mediaItems.length} items.`);
    console.log(`Matched external metadata for ${matched} items.`);
    console.log(`Updated ${updated} items.`);
    process.exit(0);
};
void run();
