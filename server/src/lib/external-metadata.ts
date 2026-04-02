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
  ageCertification: string | null;
  isAdult: boolean;
  keywords: string[];
  overview: string | null;
};

type TmdbSearchMovieResult = {
  id: number;
  title: string;
  release_date?: string | null;
  poster_path?: string | null;
  popularity?: number;
  adult?: boolean;
  overview?: string | null;
};

type TmdbSearchTvResult = {
  id: number;
  name: string;
  first_air_date?: string | null;
  poster_path?: string | null;
  popularity?: number;
  adult?: boolean;
  overview?: string | null;
};

type TmdbSearchResponse<T> = {
  results: T[];
};

type TmdbTvDetails = {
  number_of_seasons?: number | null;
  number_of_episodes?: number | null;
  adult?: boolean;
  overview?: string | null;
};

type TmdbMovieDetails = {
  adult?: boolean;
  overview?: string | null;
};

type TmdbReleaseDatesResponse = {
  results?: Array<{
    iso_3166_1?: string;
    release_dates?: Array<{
      certification?: string;
      type?: number;
    }>;
  }>;
};

type TmdbContentRatingsResponse = {
  results?: Array<{
    iso_3166_1?: string;
    rating?: string;
  }>;
};

type TmdbKeywordList = {
  keywords?: Array<{ name?: string | null }>;
  results?: Array<{ name?: string | null }>;
};

type OmdbResponse = {
  Response: 'True' | 'False';
  imdbRating?: string;
};

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const CERTIFICATION_PRIORITY = ['US', 'GB', 'EG'];

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

const normalizeCertification = (value?: string | null) => {
  const certification = value?.trim();
  return certification ? certification : null;
};

const normalizeKeywords = (values: Array<{ name?: string | null }> | undefined) => {
  if (!values) {
    return [];
  }

  return [...new Set(
    values
      .map((entry) => entry.name?.trim())
      .filter((entry): entry is string => Boolean(entry))
  )].slice(0, 12);
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

const pickCertification = (values: Array<{ country: string; certification: string | null }>) => {
  for (const country of CERTIFICATION_PRIORITY) {
    const match = values.find((entry) => entry.country === country && entry.certification);
    if (match?.certification) {
      return match.certification;
    }
  }

  return values.find((entry) => entry.certification)?.certification ?? null;
};

const fetchMovieCertification = async (id: number, headers: HeadersInit) => {
  const response = await fetchJson<TmdbReleaseDatesResponse>(
    `https://api.themoviedb.org/3/movie/${id}/release_dates`,
    { headers }
  );

  const certifications = (response.results ?? []).flatMap((country) =>
    (country.release_dates ?? []).map((releaseDate) => ({
      country: country.iso_3166_1 ?? '',
      certification: normalizeCertification(releaseDate.certification),
      type: releaseDate.type ?? Number.MAX_SAFE_INTEGER,
    }))
  );

  const sorted = certifications.sort((left, right) => left.type - right.type);
  return pickCertification(sorted.map(({ country, certification }) => ({ country, certification })));
};

const fetchSeriesCertification = async (id: number, headers: HeadersInit) => {
  const response = await fetchJson<TmdbContentRatingsResponse>(
    `https://api.themoviedb.org/3/tv/${id}/content_ratings`,
    { headers }
  );

  const ratings = (response.results ?? []).map((entry) => ({
    country: entry.iso_3166_1 ?? '',
    certification: normalizeCertification(entry.rating),
  }));

  return pickCertification(ratings);
};

const fetchTmdbMetadata = async ({ title, type, releaseYear }: MetadataLookupInput) => {
  if (!env.tmdbReadAccessToken) {
    return null;
  }

  const searchParams = new URLSearchParams({
    query: title,
    include_adult: 'true',
    language: 'en-US',
  });

  if (releaseYear) {
    searchParams.set(type === 'movie' ? 'year' : 'first_air_date_year', releaseYear.toString());
  }

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

    const [details, keywordsResponse, certification] = await Promise.all([
      fetchJson<TmdbMovieDetails>(`https://api.themoviedb.org/3/movie/${bestMatch.id}?language=en-US`, { headers }),
      fetchJson<TmdbKeywordList>(`https://api.themoviedb.org/3/movie/${bestMatch.id}/keywords`, { headers }),
      fetchMovieCertification(bestMatch.id, headers),
    ]);

    return {
      releaseYear: extractYear(bestMatch.release_date),
      posterUrl: bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null,
      totalSeasons: null,
      totalEpisodes: null,
      ageCertification: certification,
      isAdult: Boolean(details.adult ?? bestMatch.adult),
      keywords: normalizeKeywords(keywordsResponse.keywords),
      overview: details.overview?.trim() || bestMatch.overview?.trim() || null,
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

  const [details, keywordsResponse, certification] = await Promise.all([
    fetchJson<TmdbTvDetails>(`https://api.themoviedb.org/3/tv/${bestMatch.id}?language=en-US`, {
      headers,
    }),
    fetchJson<TmdbKeywordList>(`https://api.themoviedb.org/3/tv/${bestMatch.id}/keywords`, { headers }),
    fetchSeriesCertification(bestMatch.id, headers),
  ]);

  return {
    releaseYear: extractYear(bestMatch.first_air_date),
    posterUrl: bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null,
    totalSeasons: details.number_of_seasons ?? null,
    totalEpisodes: details.number_of_episodes ?? null,
    ageCertification: certification,
    isAdult: Boolean(details.adult ?? bestMatch.adult),
    keywords: normalizeKeywords(keywordsResponse.results),
    overview: details.overview?.trim() || bestMatch.overview?.trim() || null,
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

  const [tmdbResult, ratingResult] = await Promise.allSettled([
    fetchTmdbMetadata(input),
    fetchOmdbRating(input),
  ]);

  const tmdb = tmdbResult.status === 'fulfilled' ? tmdbResult.value : null;
  const rating = ratingResult.status === 'fulfilled' ? ratingResult.value : null;

  if (tmdbResult.status === 'rejected') {
    console.error(`TMDb metadata lookup failed for ${input.type} "${input.title}":`, tmdbResult.reason);
  }

  if (ratingResult.status === 'rejected') {
    console.error(`OMDb rating lookup failed for ${input.type} "${input.title}":`, ratingResult.reason);
  }

  if (!tmdb && rating === null) {
    return null;
  }

  return {
    rating,
    releaseYear: tmdb?.releaseYear ?? input.releaseYear ?? null,
    posterUrl: tmdb?.posterUrl ?? null,
    totalSeasons: tmdb?.totalSeasons ?? null,
    totalEpisodes: tmdb?.totalEpisodes ?? null,
    ageCertification: tmdb?.ageCertification ?? null,
    isAdult: tmdb?.isAdult ?? false,
    keywords: tmdb?.keywords ?? [],
    overview: tmdb?.overview ?? null,
  };
};

export const mergeExternalMetadata = <T extends {
  rating: number | null;
  releaseYear: number | null;
  posterUrl: string | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  ageCertification: string | null;
  isAdult: boolean;
  keywords: string[];
  overview: string | null;
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
    ageCertification: force ? external.ageCertification : item.ageCertification ?? external.ageCertification,
    isAdult: force ? external.isAdult : item.isAdult || external.isAdult,
    keywords: force ? external.keywords : item.keywords.length > 0 ? item.keywords : external.keywords,
    overview: force ? external.overview : item.overview ?? external.overview,
  };
};
