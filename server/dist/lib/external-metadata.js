"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeExternalMetadata = exports.fetchExternalMetadata = exports.hasExternalMetadataConfig = void 0;
const env_1 = require("../config/env");
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const normalizeTitle = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const extractYear = (value) => {
    if (!value) {
        return null;
    }
    const match = value.match(/\d{4}/);
    return match ? Number.parseInt(match[0], 10) : null;
};
const parseRating = (value) => {
    if (!value || value === 'N/A') {
        return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
};
const fetchJson = async (url, init) => {
    const response = await fetch(url, init);
    if (!response.ok) {
        throw new Error(`External request failed with status ${response.status}.`);
    }
    return (await response.json());
};
const pickBestTmdbResult = (results, getTitle, getYear, title, releaseYear) => {
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
const fetchTmdbMetadata = async ({ title, type, releaseYear }) => {
    if (!env_1.env.tmdbReadAccessToken) {
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
        Authorization: `Bearer ${env_1.env.tmdbReadAccessToken}`,
        Accept: 'application/json',
    };
    if (type === 'movie') {
        const response = await fetchJson(`https://api.themoviedb.org/3/search/movie?${searchParams.toString()}`, { headers });
        const bestMatch = pickBestTmdbResult(response.results, (result) => result.title, (result) => extractYear(result.release_date), title, releaseYear);
        if (!bestMatch) {
            return null;
        }
        return {
            releaseYear: extractYear(bestMatch.release_date),
            posterUrl: bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null,
            totalSeasons: null,
            totalEpisodes: null,
        };
    }
    const response = await fetchJson(`https://api.themoviedb.org/3/search/tv?${searchParams.toString()}`, { headers });
    const bestMatch = pickBestTmdbResult(response.results, (result) => result.name, (result) => extractYear(result.first_air_date), title, releaseYear);
    if (!bestMatch) {
        return null;
    }
    const details = await fetchJson(`https://api.themoviedb.org/3/tv/${bestMatch.id}?language=en-US`, {
        headers,
    });
    return {
        releaseYear: extractYear(bestMatch.first_air_date),
        posterUrl: bestMatch.poster_path ? `${TMDB_IMAGE_BASE_URL}${bestMatch.poster_path}` : null,
        totalSeasons: details.number_of_seasons ?? null,
        totalEpisodes: details.number_of_episodes ?? null,
    };
};
const fetchOmdbRating = async ({ title, type, releaseYear }) => {
    if (!env_1.env.omdbApiKey) {
        return null;
    }
    const createUrl = (includeYear) => {
        const searchParams = new URLSearchParams({
            apikey: env_1.env.omdbApiKey,
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
        const response = await fetchJson(url);
        if (response.Response === 'True') {
            return parseRating(response.imdbRating);
        }
    }
    return null;
};
const hasExternalMetadataConfig = () => Boolean(env_1.env.omdbApiKey && env_1.env.tmdbReadAccessToken);
exports.hasExternalMetadataConfig = hasExternalMetadataConfig;
const fetchExternalMetadata = async (input) => {
    if (!env_1.env.omdbApiKey && !env_1.env.tmdbReadAccessToken) {
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
    }
    catch (error) {
        console.error(`Metadata lookup failed for ${input.type} \"${input.title}\":`, error);
        return null;
    }
};
exports.fetchExternalMetadata = fetchExternalMetadata;
const mergeExternalMetadata = (item, external, options) => {
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
exports.mergeExternalMetadata = mergeExternalMetadata;
