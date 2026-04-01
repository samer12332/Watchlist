'use client';

import { useState } from 'react';
import { Calendar, Edit2, Star, Trash2 } from 'lucide-react';

import AddMediaModal from '@/components/add-media-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { watchlistApi } from '@/lib/api';
import type { Category, MediaItem } from '@/shared/watchlist';

interface MediaDetailsModalProps {
  media: MediaItem;
  categories: Category[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function MediaDetailsModal({
  media,
  categories,
  open,
  onOpenChange,
  onChanged,
}: MediaDetailsModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const currentSelectionCount = media.selectionCount ?? 0;

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${media.title}"?`);

    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await watchlistApi.deleteMediaItem(media.id);
      onOpenChange(false);
      onChanged();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete this item.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectToWatch = async () => {
    setSelectionError(null);
    setIsSelecting(true);

    try {
      await watchlistApi.selectMediaItem(media.id);
      onOpenChange(false);
      onChanged();
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : 'Unable to update the selection count.');
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl border-border bg-card sm:px-6">
          <DialogHeader className="border-b border-border pb-5">
            <DialogTitle className="text-xl font-bold text-foreground sm:text-2xl">{media.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
              <div>
                <img src={media.posterUrl ?? '/placeholder.jpg'} alt={media.title} className="w-full rounded-lg border border-border" />
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusColors[media.status]}>{statusLabels[media.status]}</Badge>
                  <Badge variant="outline">{media.type === 'movie' ? 'Film' : 'Series'}</Badge>
                  {media.status === 'reviewed' && <Badge variant="secondary" className="text-rose-200">Reviewed and not liked</Badge>}
                </div>

                {media.releaseYear && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{media.releaseYear}</span>
                  </div>
                )}

                {media.rating !== null && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, index) => (
                        <Star
                          key={index}
                          className={`h-4 w-4 ${
                            index < Math.round((media.rating ?? 0) / 2)
                              ? 'fill-yellow-500 text-yellow-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-foreground">{media.rating}/10</span>
                  </div>
                )}

                {media.status === 'planned' && (
                  <div className="space-y-3 rounded-lg border border-border bg-secondary p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Watch Selections</p>
                      <Badge variant="secondary">{currentSelectionCount}/3</Badge>
                    </div>
                    <Button onClick={handleSelectToWatch} disabled={isSelecting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                      {isSelecting
                        ? 'Selecting...'
                        : currentSelectionCount > 0
                          ? `Selected ${currentSelectionCount} time${currentSelectionCount === 1 ? '' : 's'}`
                          : 'Select to watch'}
                    </Button>
                    <p className="text-xs text-muted-foreground">The third selection automatically moves this item to reviewed.</p>
                    {selectionError && <p className="text-xs text-red-300">{selectionError}</p>}
                  </div>
                )}

                {media.categories.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {media.categories.map((category) => (
                        <Badge key={category.id} variant="secondary">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {media.type === 'series' && (
                  <div className="rounded-lg bg-secondary p-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Series Progress</p>
                    <div className="space-y-2">
                      {media.totalSeasons !== null && (
                        <div className="flex justify-between">
                          <span className="text-sm text-foreground">Total Seasons:</span>
                          <span className="font-semibold text-foreground">{media.totalSeasons}</span>
                        </div>
                      )}
                      {media.totalEpisodes !== null && (
                        <div className="flex justify-between">
                          <span className="text-sm text-foreground">Total Episodes:</span>
                          <span className="font-semibold text-foreground">{media.totalEpisodes}</span>
                        </div>
                      )}
                      {media.currentSeason !== null && (
                        <div className="flex justify-between">
                          <span className="text-sm text-foreground">Current Progress:</span>
                          <span className="font-semibold text-foreground">S{media.currentSeason}:E{media.currentEpisode ?? 1}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {media.notes && (
              <div className="rounded-lg bg-secondary p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                <p className="text-sm leading-relaxed text-foreground">{media.notes}</p>
              </div>
            )}

            {deleteError && <p className="text-sm text-red-300">{deleteError}</p>}

            <div className="flex gap-3 border-t border-border pt-4">
              <Button variant="outline" className="gap-2" onClick={() => setShowEditModal(true)}>
                <Edit2 className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" className="gap-2 text-red-400 hover:bg-red-500/10" onClick={handleDelete} disabled={isDeleting}>
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AddMediaModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        categories={categories}
        mode="edit"
        media={media}
        onSuccess={() => {
          setShowEditModal(false);
          onOpenChange(false);
          onChanged();
        }}
      />
    </>
  );
}
