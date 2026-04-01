'use client';

import { useDeferredValue, useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Filter, Grid3x3, List, Plus, Search } from 'lucide-react';

import AddMediaModal from '@/components/add-media-modal';
import MediaCard from '@/components/media-card';
import MediaDetailsModal from '@/components/media-details-modal';
import PaginationControls from '@/components/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { watchlistApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Category, MediaItem, MediaStatus, MediaType } from '@/shared/watchlist';

interface MediaLibraryProps {
  refreshToken: number;
  onDataChanged: () => void;
}

const PAGE_SIZE = 10;
const statusColors = {
  planned: 'bg-slate-600',
  watching: 'bg-blue-600',
  suspended: 'bg-amber-600',
  completed: 'bg-green-600',
  reviewed: 'bg-rose-600',
} as const;

const statusLabels = {
  planned: 'Planned',
  watching: 'Watching',
  suspended: 'Suspended',
  completed: 'Completed',
  reviewed: 'Reviewed',
} as const;

export default function MediaLibrary({ refreshToken, onDataChanged }: MediaLibraryProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<MediaStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'rating-asc' | 'rating-desc' | 'newest' | 'oldest'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const deferredSearch = useDeferredValue(searchQuery);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const categoryData = await watchlistApi.listCategories();
        if (active) {
          setCategories(categoryData);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load categories.');
        }
      }
    };

    void loadCategories();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, categoryFilter, sortBy, deferredSearch]);

  const selectedCategoryLabel =
    categoryFilter === 'all'
      ? 'All Categories'
      : categories.find((category) => category.id === categoryFilter)?.name ?? 'Category';

  useEffect(() => {
    let active = true;

    const loadMediaItems = async () => {
      setLoading(true);
      setError(null);

      try {
        const sortMap = {
          title: { sortBy: 'title', sortOrder: 'asc' },
          'rating-asc': { sortBy: 'rating', sortOrder: 'asc' },
          'rating-desc': { sortBy: 'rating', sortOrder: 'desc' },
          newest: { sortBy: 'createdAt', sortOrder: 'desc' },
          oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
        } as const;

        const response = await watchlistApi.listMedia({
          type: typeFilter === 'all' ? undefined : typeFilter,
          status: statusFilter === 'all' ? undefined : statusFilter,
          categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
          search: deferredSearch.trim() || undefined,
          sortBy: sortMap[sortBy].sortBy,
          sortOrder: sortMap[sortBy].sortOrder,
          page: currentPage,
          pageSize: PAGE_SIZE,
        });

        if (!active) {
          return;
        }

        setMediaItems(response.data);
        setTotalItems(response.meta?.total ?? response.data.length);
        setTotalPages(response.meta?.totalPages ?? 1);

        const responsePage = response.meta?.page ?? currentPage;
        if (responsePage !== currentPage) {
          setCurrentPage(responsePage);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load media items.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadMediaItems();

    return () => {
      active = false;
    };
  }, [categoryFilter, currentPage, deferredSearch, refreshToken, sortBy, statusFilter, typeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="border-border bg-secondary pl-10"
          />
        </div>
        <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
        <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as MediaType | 'all')}>
          <SelectTrigger className="border-border bg-secondary">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="movie">Movies</SelectItem>
            <SelectItem value="series">Series</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MediaStatus | 'all')}>
          <SelectTrigger className="border-border bg-secondary">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="watching">Watching</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={categoryPickerOpen} onOpenChange={setCategoryPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={categoryPickerOpen}
              className="w-full justify-between border-border bg-secondary text-foreground hover:bg-secondary"
            >
              <span className="truncate">{selectedCategoryLabel}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] border-border bg-card p-0" align="start">
            <Command>
              <CommandInput placeholder="Search category..." />
              <CommandList>
                <CommandEmpty>No category found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all categories"
                    onSelect={() => {
                      setCategoryFilter('all');
                      setCategoryPickerOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', categoryFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                    All Categories
                  </CommandItem>
                  {categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={`${category.name} ${category.group?.name ?? ''}`}
                      onSelect={() => {
                        setCategoryFilter(category.id);
                        setCategoryPickerOpen(false);
                      }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', categoryFilter === category.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="truncate">{category.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
          <SelectTrigger className="border-border bg-secondary">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent className="border-border bg-card">
            <SelectItem value="newest">Newest Added</SelectItem>
            <SelectItem value="oldest">Oldest Added</SelectItem>
            <SelectItem value="title">Title (A-Z)</SelectItem>
            <SelectItem value="rating-desc">Highest Rated</SelectItem>
            <SelectItem value="rating-asc">Lowest Rated</SelectItem>
          </SelectContent>
        </Select>

        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'list')}>
          <ToggleGroupItem value="grid" aria-label="Grid view" className="border-border">
            <Grid3x3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" className="border-border">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing page <span className="font-semibold text-foreground">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Total results <span className="font-semibold text-foreground">{totalItems}</span>
        </p>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading library...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-red-300">{error}</Card>
      ) : mediaItems.length === 0 ? (
        <Card className="p-12 text-center">
          <Filter className="mx-auto mb-3 h-8 w-8 text-muted-foreground opacity-50" />
          <p className="font-medium text-foreground">No items found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or adding something new.</p>
        </Card>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {mediaItems.map((item) => (
                <MediaCard key={item.id} media={item} categories={categories} onChanged={onDataChanged} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {mediaItems.map((item) => (
                <ListItemView key={item.id} media={item} onOpen={() => setSelectedMedia(item)} />
              ))}
            </div>
          )}

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            itemLabel="results"
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <AddMediaModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        categories={categories}
        mode="add"
        onSuccess={onDataChanged}
      />
      {selectedMedia && (
        <MediaDetailsModal
          media={selectedMedia}
          categories={categories}
          open={Boolean(selectedMedia)}
          onOpenChange={(open) => !open && setSelectedMedia(null)}
          onChanged={() => {
            setSelectedMedia(null);
            onDataChanged();
          }}
        />
      )}
    </div>
  );
}

function ListItemView({ media, onOpen }: { media: MediaItem; onOpen: () => void }) {
  return (
    <Card className="cursor-pointer border-border p-4 transition-colors hover:border-indigo-500/50" onClick={onOpen}>
      <div className="flex items-start gap-4">
        <img src={media.posterUrl ?? '/placeholder.jpg'} alt={media.title} className="h-24 w-16 flex-shrink-0 rounded object-cover" />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">{media.title}</h3>
              <p className="text-xs text-muted-foreground">
                {media.releaseYear ?? 'Unknown year'} • {media.type === 'movie' ? 'Film' : 'Series'}
              </p>
            </div>
            <span className={`flex-shrink-0 rounded px-3 py-1 text-xs font-medium text-white ${statusColors[media.status]}`}>
              {statusLabels[media.status]}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {media.rating !== null && <div className="text-sm font-medium text-yellow-500">{media.rating}/10</div>}
            {media.categories.length > 0 && (
              <div className="text-xs text-muted-foreground">{media.categories.slice(0, 2).map((category) => category.name).join(', ')}</div>
            )}
          </div>
          {media.type === 'series' && media.currentSeason !== null && (
            <p className="mt-2 text-xs text-muted-foreground">S{media.currentSeason}:E{media.currentEpisode ?? 1}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
