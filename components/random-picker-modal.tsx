'use client';

import { Sparkles, Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Category, MediaItem } from '@/shared/watchlist';

interface RandomPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  media?: MediaItem | null;
  relatedItems?: MediaItem[];
  error?: string | null;
  onRepick?: () => void;
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

export default function RandomPickerModal({
  open,
  onOpenChange,
  category,
  media,
  relatedItems = [],
  error,
  onRepick,
}: RandomPickerModalProps) {
  const dialogTitle = media ? 'Here is What to Watch Next' : category ? 'Random Category' : 'No Match Found';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse text-indigo-400" />
              <h2 className="text-2xl font-bold text-foreground">{dialogTitle}</h2>
              <Sparkles className="h-5 w-5 animate-pulse text-indigo-400" />
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-border bg-secondary p-6 text-center text-red-300">{error}</div>
          ) : media ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="md:col-span-1">
                <img src={media.posterUrl ?? '/placeholder.jpg'} alt={media.title} className="w-full rounded-lg border border-border shadow-lg shadow-indigo-500/20" />
              </div>
              <div className="space-y-4 md:col-span-2">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{media.title}</h3>
                  {media.releaseYear && <p className="mt-1 text-sm text-muted-foreground">{media.releaseYear}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={statusColors[media.status]}>{statusLabels[media.status]}</Badge>
                  <Badge variant="outline">{media.type === 'movie' ? 'Film' : 'Series'}</Badge>
                </div>

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

                {media.categories.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {media.categories.map((entry) => (
                        <Badge key={entry.id} variant="secondary">
                          {entry.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {media.notes && (
                  <div className="rounded-lg border border-border bg-secondary p-4">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
                    <p className="text-sm leading-relaxed text-foreground">{media.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ) : category ? (
            <div className="space-y-4 rounded-lg border border-border bg-secondary p-6">
              <div className="flex items-center justify-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color ?? '#6366f1' }} />
                <h3 className="text-3xl font-bold text-foreground">{category.name}</h3>
              </div>
              <p className="text-center text-sm text-muted-foreground">{relatedItems.length} sample item{relatedItems.length === 1 ? '' : 's'} in this category.</p>
              {relatedItems.length > 0 && (
                <div className="space-y-2">
                  {relatedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-md bg-background/70 px-3 py-2 text-sm">
                      <span className="text-foreground">{item.title}</span>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex gap-3 border-t border-border pt-4">
            <Button onClick={() => onOpenChange(false)} className="flex-1 bg-indigo-600 hover:bg-indigo-700">Close</Button>
            {onRepick && (
              <Button variant="outline" onClick={onRepick} className="flex-1">Pick Another</Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
