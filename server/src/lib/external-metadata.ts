import { env } from '../config/env';

type SupportedMediaType = 'movie' | 'series';

type MetadataLookupInput = {
  title: string;
  type: SupportedMediaType;
  releaseYear?: number | null;
};

export type ExternalMetadata = {
  rating: number | null;
  releaseYear: number | null;
  posterUrl: string | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
};

type TmdbSearchMovieResult = {
  id: number;
  title: string;
  release_date?: string | null;
  poster_path?: string | null;
  popularity?: number;
};

type TmdbSearchTvResult = {
  id: number;
  name: string;
  first_air_date?: string | null;
  poster_path?: string | null;
  popularity?: number;
};

type TmdbSearchResponse<T> = {
  results: T[];
};

type TmdbTvDetails = {
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
};

type OmdbResponse = {
  Response: 'True' | 'False';
  imdbRating?: string;
};

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const extractYear = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : null;
};

const parseRating = (value?: string) => {
  if (!value || value === 'N/A') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const fetchJson = async <T>(url: string, init?: RequestInit) => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`External request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
};

const pickBestTmdbResult = <T extends { popularity?: number }>(
  results: T[],
  getTitle: (result: T) => string,
  getYear: (result: T) => number | null,
  title: string,
  releaseYear?: number | null
) => {
  const normalizedTitle = normalizeTitle(title);

  return [...results].sort((left, right) => {
    const leftExact = normalizeTitle(getTitle(left)) === normalizedTitle ? 1 : 0;
    const rightExact = normalizeTitle(getTitle(right)) === normalizedTitle ? 1 : 0;

    if (leftExact !== rightExact) {
      return rightExact - leftExact;
    }

    if (releaseYear) {
      const leftYearDelta = Math.abs((getYear(left) ?? releaseYear) - releaseYear);
      const rightYearDelta = Math.abs((getYear(right) ?? releaseYear) - releaseYear);

      if (leftYearDelta !== rightYearDelta) {
        return leftYearDelta - rightYearDelta;
      }
    }

    return (right.popularity ?? 0) - (left.popularity ?? 0);
  })[0];
};

const fetchTmdbMetadata = async ({ title, type, releaseYear }: MetadataLookupInput) => {
  if (!env.tmdbReadAccessToken) {
    return null;
  }

  const searchParams = new URLSearchParams({
    query: title,
    include_adult: 'false',
    language: 'en-US',
  });

  if (releaseYear) {
    searchParams.set(type === 'movie' ? 'year' : 'first_air_date_year', releaseYear.toString());
  }

  const path = type === 'movie' ? 'movie' : 'tv';
  const headers = {
    Authorization: `Bearer ${env.tmdbReadAccessToken}`,
    Accept: 'application/json',
  };

  if (type === 'movie') {
    const response = await fetchJson<TmdbSearchResponse<TmdbSearchMovieResult>>(
      `https://api.themoviedb.org/3/search/movie?${searchParams.toString()}`,
      { headers }
    );

    const bestMatch = pickBestTmdbResult(
      response.results,
      (result) => result.title,
      (result) => extractYear(result.release_date),
      title,
      releaseYear
    );

    if (!bestMatch) {
      return null;
    }

    return {
      releaseYear: extractYear(bestMatch.release_date),
      posterUrl: bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null,
      totalSeasons: null,
      totalEpisodes: null,
    } satisfies Omit<ExternalMetadata, 'rating'>;
  }

  const response = await fetchJson<TmdbSearchResponse<TmdbSearchTvResult>>(
    `https://api.themoviedb.org/3/search/tv?${searchParams.toString()}`,
    { headers }
  );

  const bestMatch = pickBestTmdbResult(
    response.results,
    (result) => result.name,
    (result) => extractYear(result.first_air_date),
    title,
    releaseYear
  );

  if (!bestMatch) {
    return null;
  }

  const details = await fetchJson<TmdbTvDetails>(`https://api.themoviedb.org/3/tv/${bestMatch.id}?language=en-US`, {
    headers,
  });

  return {
    releaseYear: extractYear(bestMatch.first_air_date),
    posterUrl: bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null,
    totalSeasons: details.number_of_seasons ?? null,
    totalEpisodes: details.number_of_episodes ?? null,
  } satisfies Omit<ExternalMetadata, 'rating'>;
};

const fetchOmdbRating = async ({ title, type, releaseYear }: MetadataLookupInput) => {
  if (!env.omdbApiKey) {
    return null;
  }

  const createUrl = (includeYear: boolean) => {
    const searchParams = new URLSearchParams({
      apikey: env.omdbApiKey!,
      t: title,
      type,
    });

    if (includeYear && releaseYear) {
      searchParams.set('y', releaseYear.toString());
    }

    return `https://www.omdbapi.com/?${searchParams.toString()}`;
  };

  const attempts = [createUrl(true), createUrl(false)];

  for (const url of attempts) {
    const response = await fetchJson<OmdbResponse>(url);

    if (response.Response === 'True') {
      return parseRating(response.imdbRating);
    }
  }

  return null;
};

export const hasExternalMetadataConfig = () => Boolean(env.omdbApiKey && env.tmdbReadAccessToken);

export const fetchExternalMetadata = async (input: MetadataLookupInput): Promise<ExternalMetadata | null> => {
  if (!env.omdbApiKey && !env.tmdbReadAccessToken) {
    return null;
  }

  try {
    const [tmdb, rating] = await Promise.all([
      fetchTmdbMetadata(input),
      fetchOmdbRating(input),
    ]);

    if (!tmdb && rating === null) {
      return null;
    }

    return {
      rating,
      releaseYear: tmdb?.releaseYear ?? input.releaseYear ?? null,
      posterUrl: tmdb?.posterUrl ?? null,
      totalSeasons: tmdb?.totalSeasons ?? null,
      totalEpisodes: tmdb?.totalEpisodes ?? null,
    };
  } catch (error) {
    console.error(`Metadata lookup failed for ${input.type} \"${input.title}\":`, error);
    return null;
  }
};

export const mergeExternalMetadata = <T extends {
  rating: number | null;
  releaseYear: number | null;
  posterUrl: string | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
}>(
  item: T,
  external: ExternalMetadata | null,
  options?: { force?: boolean }
) => {
  if (!external) {
    return item;
  }

  const force = options?.force ?? false;

  return {
    ...item,
    rating: force ? external.rating : item.rating ?? external.rating,
    releaseYear: force ? external.releaseYear : item.releaseYear ?? external.releaseYear,
    posterUrl: force ? external.posterUrl : item.posterUrl ?? external.posterUrl,
    totalSeasons: force ? external.totalSeasons : item.totalSeasons ?? external.totalSeasons,
    totalEpisodes: force ? external.totalEpisodes : item.totalEpisodes ?? external.totalEpisodes,
  };
};