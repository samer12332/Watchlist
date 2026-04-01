'use client';

import { useState } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { watchlistApi } from '@/lib/api';
import type { MediaItem, MediaPayload, MediaStatus } from '@/shared/watchlist';

interface QuickStatusSelectProps {
  media: MediaItem;
  onChanged: () => void;
  compact?: boolean;
}

const STATUS_OPTIONS: Array<{ value: MediaStatus; label: string }> = [
  { value: 'planned', label: 'Planned' },
  { value: 'watching', label: 'Watching' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'completed', label: 'Completed' },
  { value: 'reviewed', label: 'Reviewed' },
];

const buildStatusPayload = (media: MediaItem, nextStatus: MediaStatus): Partial<MediaPayload> => {
  if (nextStatus === 'completed') {
    return {
      status: nextStatus,
      liked: media.status === 'reviewed' ? null : media.liked,
      rating: media.rating,
      selectionCount: 0,
    };
  }

  if (nextStatus === 'reviewed') {
    return {
      status: nextStatus,
      liked: false,
      rating: media.rating,
      selectionCount: 0,
    };
  }

  return {
    status: nextStatus,
    liked: null,
    rating: null,
    selectionCount: 0,
  };
};

export default function QuickStatusSelect({ media, onChanged, compact = false }: QuickStatusSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (nextStatus: string) => {
    if (nextStatus === media.status) {
      return;
    }

    setError(null);
    setIsUpdating(true);

    try {
      await watchlistApi.updateMediaItem(media.id, buildStatusPayload(media, nextStatus as MediaStatus));
      onChanged();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update status.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Select value={media.status} onValueChange={handleStatusChange} disabled={isUpdating}>
        <SelectTrigger className={compact ? 'h-8 border-border bg-secondary text-xs' : 'border-border bg-secondary'}>
          <SelectValue placeholder="Change status" />
        </SelectTrigger>
        <SelectContent className="border-border bg-card">
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-red-300">{error}</p>}
    </div>
  );
}
