'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { Bookmark, Play, Star, Trash2 } from 'lucide-react';

import MediaDetailsModal from '@/components/media-details-modal';
import QuickStatusSelect from '@/components/quick-status-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { watchlistApi } from '@/lib/api';
import type { Category, MediaItem } from '@/shared/watchlist';

interface MediaCardProps {
  media: MediaItem;
  categories: Category[];
  onChanged: () => void;
}

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

export default function MediaCard({ media, categories, onChanged }: MediaCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(media.isBookmarked);

  const currentSelectionCount = media.selectionCount ?? 0;

  useEffect(() => {
    setIsBookmarked(media.isBookmarked);
  }, [media.isBookmarked]);

  const handleSelectToWatch = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setSelectionError(null);
    setIsSelecting(true);

    try {
      await watchlistApi.selectMediaItem(media.id);
      onChanged();
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : 'Unable to update the selection count.');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleToggleBookmark = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setBookmarkError(null);
    setIsBookmarking(true);

    try {
      const nextBookmarked = !isBookmarked;
      setIsBookmarked(nextBookmarked);
      await watchlistApi.updateMediaItem(media.id, { isBookmarked: nextBookmarked });
    } catch (error) {
      setIsBookmarked((previous) => !previous);
      setBookmarkError(error instanceof Error ? error.message : 'Unable to update bookmark.');
    } finally {
      setIsBookmarking(false);
    }
  };

  return (
    <>
      <Card
        className="group cursor-pointer overflow-hidden border-border transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10"
        onClick={() => setShowDetails(true)}
      >
        <div className="relative h-48 overflow-hidden bg-secondary sm:h-56">
          <img
            src={media.posterUrl ?? '/placeholder.jpg'}
            alt={media.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <div className="w-full p-3">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 fill-white text-white" />
                <span className="text-xs font-medium text-white">View Details</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <Badge className={`${statusColors[media.status]} text-[10px] uppercase tracking-wide`}>{statusLabels[media.status]}</Badge>
            <div className="ml-auto flex max-w-full flex-wrap justify-end gap-1">
              {isBookmarked && <Badge variant="secondary" className="text-[10px]">Saved</Badge>}
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                {media.type === 'movie' ? 'Film' : 'Series'}
              </Badge>
            </div>
          </div>

          <div>
            <h3 className="line-clamp-2 text-sm font-semibold text-foreground">{media.title}</h3>
            {media.releaseYear && <p className="mt-1 text-[11px] text-muted-foreground">{media.releaseYear}</p>}
          </div>

          <QuickStatusSelect media={media} onChanged={onChanged} compact />

          {media.rating !== null && (
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, index) => (
                  <Star
                    key={index}
                    className={`h-3.5 w-3.5 ${
                      index < Math.round((media.rating ?? 0) / 2)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-foreground">{media.rating}/10</span>
            </div>
          )}

          {media.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {media.categories.slice(0, 2).map((category) => (
                <Badge key={category.id} variant="secondary" className="max-w-full text-[10px]">
                  <span className="truncate">{category.name}</span>
                </Badge>
              ))}
              {media.categories.length > 2 && (
                <Badge variant="secondary" className="text-[10px]">
                  +{media.categories.length - 2}
                </Badge>
              )}
            </div>
          )}

          {media.status === 'reviewed' && (
            <p className="text-[11px] font-medium text-rose-300">Reviewed and not for me</p>
          )}

          {media.status === 'planned' && (
            <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/60 p-2.5">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Selected</span>
                <span>{currentSelectionCount}/3</span>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleSelectToWatch}
                disabled={isSelecting}
                className="h-8 w-full bg-indigo-600 text-xs hover:bg-indigo-700"
              >
                {isSelecting
                  ? 'Selecting...'
                  : currentSelectionCount > 0
                    ? `Selected ${currentSelectionCount}x`
                    : 'Select to watch'}
              </Button>
              {selectionError && <p className="text-[11px] text-red-300">{selectionError}</p>}
            </div>
          )}

          {media.type === 'series' && media.currentSeason !== null && (
            <div className="text-[11px] text-muted-foreground">
              S{media.currentSeason}:E{media.currentEpisode ?? 1}
              {media.totalSeasons !== null && ` / ${media.totalSeasons} seasons`}
            </div>
          )}

          {(bookmarkError || selectionError) && (
            <p className="text-[11px] text-red-300">{bookmarkError ?? selectionError}</p>
          )}

          <div className="flex items-center justify-between border-t border-border/50 pt-2">
            <button
              type="button"
              className={`transition-colors ${isBookmarked ? 'text-indigo-400' : 'text-muted-foreground hover:text-indigo-400'}`}
              onClick={handleToggleBookmark}
              disabled={isBookmarking}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-red-400"
              onClick={(event) => {
                event.stopPropagation();
                setShowDetails(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      <MediaDetailsModal
        media={media}
        categories={categories}
        open={showDetails}
        onOpenChange={setShowDetails}
        onChanged={onChanged}
      />
    </>
  );
}
