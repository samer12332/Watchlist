export const MEDIA_TYPES = ['movie', 'series'] as const;
export const MEDIA_STATUSES = ['planned', 'watching', 'suspended', 'completed', 'reviewed'] as const;
export const MEDIA_SORT_FIELDS = ['title', 'rating', 'createdAt'] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];
export type MediaStatus = (typeof MEDIA_STATUSES)[number];
export type MediaSortField = (typeof MEDIA_SORT_FIELDS)[number];

export interface CategoryGroup {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  group: CategoryGroup | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating: number | null;
  liked: boolean | null;
  isBookmarked: boolean;
  ageCertification: string | null;
  isAdult: boolean;
  keywords: string[];
  overview: string | null;
  selectionCount: number;
  notes: string | null;
  releaseYear: number | null;
  posterUrl: string | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  currentSeason: number | null;
  currentEpisode: number | null;
  categories: Category[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryGroupPayload {
  name: string;
  color?: string | null;
  description?: string | null;
}

export interface CategoryPayload {
  name: string;
  color?: string | null;
  groupId?: string | null;
}

export interface MediaPayload {
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating?: number | null;
  liked?: boolean | null;
  isBookmarked?: boolean;
  ageCertification?: string | null;
  isAdult?: boolean;
  keywords?: string[];
  overview?: string | null;
  selectionCount?: number;
  notes?: string | null;
  releaseYear?: number | null;
  posterUrl?: string | null;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
  currentSeason?: number | null;
  currentEpisode?: number | null;
  categoryIds: string[];
}

export interface MediaListQuery {
  type?: MediaType;
  status?: MediaStatus;
  categoryId?: string;
  search?: string;
  sortBy?: MediaSortField;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface RandomMediaQuery {
  type?: MediaType;
  status?: MediaStatus;
  categoryId?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiListMeta {
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  meta?: ApiListMeta;
}

