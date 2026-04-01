'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dice6, Plus, Sparkles } from 'lucide-react';

import AddMediaModal from '@/components/add-media-modal';
import MediaCard from '@/components/media-card';
import RandomPickerModal from '@/components/random-picker-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { watchlistApi } from '@/lib/api';
import type { Category, MediaItem, MediaType } from '@/shared/watchlist';

interface DashboardProps {
  refreshToken: number;
  onDataChanged: () => void;
}

export default function Dashboard({ refreshToken, onDataChanged }: DashboardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<MediaType>('movie');
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomCategory, setRandomCategory] = useState<Category | null>(null);
  const [randomMedia, setRandomMedia] = useState<MediaItem | null>(null);
  const [randomError, setRandomError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [categoryData, mediaResponse] = await Promise.all([
          watchlistApi.listCategories(),
          watchlistApi.listMedia({ sortBy: 'createdAt', sortOrder: 'desc' }),
        ]);

        if (!active) {
          return;
        }

        setCategories(categoryData);
        setMediaItems(mediaResponse.data);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard data.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const summary = useMemo(() => {
    const completed = mediaItems.filter((item) => item.status === 'completed').length;
    const reviewed = mediaItems.filter((item) => item.status === 'reviewed').length;
    const watching = mediaItems.filter((item) => item.status === 'watching').length;
    const suspended = mediaItems.filter((item) => item.status === 'suspended').length;
    const planned = mediaItems.filter((item) => item.status === 'planned').length;

    return {
      totalItems: mediaItems.length,
      totalMovies: mediaItems.filter((item) => item.type === 'movie').length,
      totalSeries: mediaItems.filter((item) => item.type === 'series').length,
      completed,
      reviewed,
      watching,
      suspended,
      planned,
    };
  }, [mediaItems]);

  const recentItems = useMemo(() => mediaItems.slice(0, 8), [mediaItems]);
  const topRatedItems = useMemo(
    () => [...mediaItems].filter((item) => item.rating !== null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 8),
    [mediaItems]
  );

  const handleOpenAddModal = (type: MediaType) => {
    setModalType(type);
    setShowAddModal(true);
  };

  const handleRandomCategory = async () => {
    setRandomError(null);
    setRandomMedia(null);

    try {
      const category = await watchlistApi.getRandomCategory();
      setRandomCategory(category);
      setShowRandomModal(true);
    } catch (randomLoadError) {
      setRandomCategory(null);
      setRandomError(randomLoadError instanceof Error ? randomLoadError.message : 'Unable to pick a category.');
      setShowRandomModal(true);
    }
  };

  const handleRandomMedia = async () => {
    setRandomError(null);
    setRandomCategory(null);

    try {
      const mediaItem = await watchlistApi.getRandomMediaItem();
      setRandomMedia(mediaItem);
      setShowRandomModal(true);
    } catch (randomLoadError) {
      setRandomMedia(null);
      setRandomError(randomLoadError instanceof Error ? randomLoadError.message : 'Unable to pick media.');
      setShowRandomModal(true);
    }
  };

  const relatedCategoryItems = randomCategory
    ? mediaItems.filter((item) => item.categories.some((category) => category.id === randomCategory.id)).slice(0, 4)
    : [];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-8">
        <StatCard label="Total Items" value={summary.totalItems} />
        <StatCard label="Movies" value={summary.totalMovies} />
        <StatCard label="Series" value={summary.totalSeries} />
        <StatCard label="Completed" value={summary.completed} highlight />
        <StatCard label="Reviewed" value={summary.reviewed} highlight />
        <StatCard label="Watching" value={summary.watching} highlight />
        <StatCard label="Suspended" value={summary.suspended} highlight />
        <StatCard label="Planned" value={summary.planned} highlight />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Button onClick={() => handleOpenAddModal('movie')} className="h-auto flex-col gap-2 bg-indigo-600 py-5 hover:bg-indigo-700">
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Add Movie</span>
        </Button>
        <Button onClick={() => handleOpenAddModal('series')} className="h-auto flex-col gap-2 bg-purple-600 py-5 hover:bg-purple-700">
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Add Series</span>
        </Button>
        <Button onClick={handleRandomCategory} variant="outline" className="h-auto flex-col gap-2 py-5">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium">Random Category</span>
        </Button>
        <Button onClick={handleRandomMedia} variant="outline" className="h-auto flex-col gap-2 py-5">
          <Dice6 className="h-5 w-5" />
          <span className="text-sm font-medium">Pick Planned</span>
        </Button>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Loading dashboard data...</Card>
      ) : error ? (
        <Card className="p-10 text-center text-red-300">{error}</Card>
      ) : (
        <>
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Recently Added</h2>
              <Badge variant="secondary">Last 8</Badge>
            </div>
            {recentItems.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">No media added yet.</Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {recentItems.map((item) => (
                  <MediaCard key={item.id} media={item} categories={categories} onChanged={onDataChanged} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Top Rated</h2>
              <Badge variant="secondary">Highest Scores</Badge>
            </div>
            {topRatedItems.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">Completed and reviewed items with ratings will show up here.</Card>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {topRatedItems.map((item) => (
                  <MediaCard key={item.id} media={item} categories={categories} onChanged={onDataChanged} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold text-foreground">Categories Overview</h2>
            {categories.length === 0 ? (
              <Card className="p-10 text-center text-muted-foreground">Create your first category to organize the library.</Card>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {categories.map((category) => {
                  const count = mediaItems.filter((item) => item.categories.some((entry) => entry.id === category.id)).length;
                  return (
                    <Card key={category.id} className="cursor-default border-border p-3 transition-colors hover:border-indigo-500/50">
                      <div className="line-clamp-2 text-xs font-medium text-foreground sm:text-sm">{category.name}</div>
                      <div className="mt-2 text-xl font-bold text-indigo-400 sm:text-2xl">{count}</div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <AddMediaModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        categories={categories}
        initialType={modalType}
        mode="add"
        onSuccess={onDataChanged}
      />
      <RandomPickerModal
        open={showRandomModal}
        onOpenChange={setShowRandomModal}
        category={randomCategory}
        media={randomMedia}
        relatedItems={relatedCategoryItems}
        error={randomError}
        onRepick={randomMedia ? handleRandomMedia : randomCategory ? handleRandomCategory : undefined}
      />
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card className={`p-3 sm:p-4 ${highlight ? 'border-indigo-500/50 bg-indigo-500/5' : ''}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-bold sm:text-3xl ${highlight ? 'text-indigo-400' : 'text-foreground'}`}>{value}</div>
    </Card>
  );
}
