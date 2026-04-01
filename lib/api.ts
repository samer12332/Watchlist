import type {
  ApiListResponse,
  ApiResponse,
  Category,
  CategoryGroup,
  CategoryGroupPayload,
  CategoryPayload,
  MediaItem,
  MediaListQuery,
  MediaPayload,
  RandomMediaQuery,
} from '@/shared/watchlist';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

const getApiBaseUrl = () => {
  const configuredBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').trim().replace(/\/$/, '');

  if (!configuredBaseUrl) {
    return '';
  }

  if (typeof window === 'undefined') {
    return configuredBaseUrl;
  }

  try {
    const configuredUrl = new URL(configuredBaseUrl, window.location.origin);
    const configuredIsLocal = LOCAL_HOSTNAMES.has(configuredUrl.hostname);
    const currentIsLocal = LOCAL_HOSTNAMES.has(window.location.hostname);

    if (configuredIsLocal && !currentIsLocal) {
      return '';
    }

    return configuredUrl.origin === window.location.origin ? '' : configuredBaseUrl;
  } catch {
    return configuredBaseUrl;
  }
};

export class ApiError extends Error {
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.details = details;
  }
}

const createQueryString = (query?: Record<string, string | undefined>) => {
  if (!query) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) {
      searchParams.set(key, value);
    }
  }

  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new ApiError(body?.message ?? 'Request failed.', body?.details);
  }

  return body as T;
};

export const watchlistApi = {
  listCategoryGroups: async () => {
    const response = await request<ApiResponse<CategoryGroup[]>>('/api/category-groups');
    return response.data;
  },
  createCategoryGroup: async (payload: CategoryGroupPayload) => {
    const response = await request<ApiResponse<CategoryGroup>>('/api/category-groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
  updateCategoryGroup: async (id: string, payload: CategoryGroupPayload) => {
    const response = await request<ApiResponse<CategoryGroup>>(`/api/category-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
  deleteCategoryGroup: async (id: string) => {
    await request(`/api/category-groups/${id}`, {
      method: 'DELETE',
    });
  },
  listCategories: async () => {
    const response = await request<ApiResponse<Category[]>>('/api/categories');
    return response.data;
  },
  createCategory: async (payload: CategoryPayload) => {
    const response = await request<ApiResponse<Category>>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
  updateCategory: async (id: string, payload: CategoryPayload) => {
    const response = await request<ApiResponse<Category>>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
  deleteCategory: async (id: string) => {
    await request(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },
  listMedia: async (query?: MediaListQuery) => {
    const response = await request<ApiListResponse<MediaItem>>(
      `/api/media${createQueryString({
        type: query?.type,
        status: query?.status,
        categoryId: query?.categoryId,
        search: query?.search,
        sortBy: query?.sortBy,
        sortOrder: query?.sortOrder,
        page: query?.page?.toString(),
        pageSize: query?.pageSize?.toString(),
      })}`
    );

    return response;
  },
  getMediaItem: async (id: string) => {
    const response = await request<ApiResponse<MediaItem>>(`/api/media/${id}`);
    return response.data;
  },
  createMediaItem: async (payload: MediaPayload) => {
    const response = await request<ApiResponse<MediaItem>>('/api/media', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
  updateMediaItem: async (id: string, payload: Partial<MediaPayload>) => {
    const response = await request<ApiResponse<MediaItem>>(`/api/media/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
  selectMediaItem: async (id: string) => {
    const response = await request<ApiResponse<MediaItem>>(`/api/media/${id}/select`, {
      method: 'POST',
    });
    return response.data;
  },
  deleteMediaItem: async (id: string) => {
    await request(`/api/media/${id}`, {
      method: 'DELETE',
    });
  },
  getRandomCategory: async () => {
    const response = await request<ApiResponse<Category>>('/api/random/category');
    return response.data;
  },
  getRandomMediaItem: async (query?: RandomMediaQuery) => {
    const response = await request<ApiResponse<MediaItem>>(
      `/api/random/media${createQueryString({
        type: query?.type,
        status: query?.status,
        categoryId: query?.categoryId,
      })}`
    );
    return response.data;
  },
};
