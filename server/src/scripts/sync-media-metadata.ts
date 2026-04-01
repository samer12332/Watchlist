import { connectToDatabase } from '../lib/db';
import { fetchExternalMetadata, hasExternalMetadataConfig, mergeExternalMetadata } from '../lib/external-metadata';
import { MediaItemModel } from '../models/media-item';

const MIN_ALLOWED_RATING = 6.5;
const sanitizeSyncedRating = (rating: number | null) => (rating !== null && rating < MIN_ALLOWED_RATING ? null : rating);

const run = async () => {
  if (!hasExternalMetadataConfig()) {
    throw new Error('Missing OMDB_API_KEY or TMDB_READ_ACCESS_TOKEN.');
  }

  await connectToDatabase();

  const mediaItems = (await MediaItemModel.find({}).lean()) as any[];
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
        ageCertification: mediaItem.ageCertification as string | null,
        isAdult: Boolean(mediaItem.isAdult),
        keywords: Array.isArray(mediaItem.keywords) ? (mediaItem.keywords as string[]) : [],
        overview: mediaItem.overview as string | null,
      },
      external,
      { force: true }
    );

    const nextRating = sanitizeSyncedRating(merged.rating);
    const currentKeywords = Array.isArray(mediaItem.keywords) ? mediaItem.keywords : [];

    const changed =
      nextRating !== mediaItem.rating ||
      merged.releaseYear !== mediaItem.releaseYear ||
      merged.posterUrl !== mediaItem.posterUrl ||
      merged.totalSeasons !== mediaItem.totalSeasons ||
      merged.totalEpisodes !== mediaItem.totalEpisodes ||
      merged.ageCertification !== mediaItem.ageCertification ||
      merged.isAdult !== Boolean(mediaItem.isAdult) ||
      JSON.stringify(merged.keywords) !== JSON.stringify(currentKeywords) ||
      merged.overview !== mediaItem.overview;

    if (!changed) {
      continue;
    }

    await MediaItemModel.updateOne(
      { _id: mediaItem._id },
      {
        $set: {
          rating: nextRating,
          releaseYear: merged.releaseYear,
          posterUrl: merged.posterUrl,
          totalSeasons: merged.totalSeasons,
          totalEpisodes: merged.totalEpisodes,
          ageCertification: merged.ageCertification,
          isAdult: merged.isAdult,
          keywords: merged.keywords,
          overview: merged.overview,
        },
      }
    );

    updated += 1;
  }

  console.log(`Checked ${mediaItems.length} items.`);
  console.log(`Matched external metadata for ${matched} items.`);
  console.log(`Updated ${updated} items.`);
  process.exit(0);
};

void run();
