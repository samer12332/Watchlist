import { connectToDatabase } from '../lib/db';
import { fetchExternalMetadata, hasExternalMetadataConfig, mergeExternalMetadata } from '../lib/external-metadata';
import { MediaItemModel } from '../models/media-item';

const run = async () => {
  if (!hasExternalMetadataConfig()) {
    throw new Error('Missing OMDB_API_KEY or TMDB_READ_ACCESS_TOKEN.');
  }

  await connectToDatabase();

  const mediaItems = (await MediaItemModel.find({})) as any[];
  let updated = 0;
  let matched = 0;

  for (const mediaItem of mediaItems) {
    const external = await fetchExternalMetadata({
      title: mediaItem.title as string,
      type: mediaItem.type as 'movie' | 'series',
      releaseYear: mediaItem.releaseYear as number | null | undefined,
    });

    if (!external) {
      continue;
    }

    matched += 1;

    const merged = mergeExternalMetadata(
      {
        rating: mediaItem.rating as number | null,
        releaseYear: mediaItem.releaseYear as number | null,
        posterUrl: mediaItem.posterUrl as string | null,
        totalSeasons: mediaItem.totalSeasons as number | null,
        totalEpisodes: mediaItem.totalEpisodes as number | null,
      },
      external,
      { force: true }
    );

    const changed =
      merged.rating !== mediaItem.rating ||
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