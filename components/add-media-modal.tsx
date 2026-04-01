'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Sparkles, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { watchlistApi } from '@/lib/api';
import type { Category, MediaItem, MediaPayload, MediaStatus, MediaType } from '@/shared/watchlist';

interface AddMediaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  mode: 'add' | 'edit';
  media?: MediaItem;
  initialType?: MediaType;
  onSuccess: () => void;
}

const MIN_ALLOWED_RATING = 6.5;
const toInputValue = (value: number | null | undefined) => (value ?? '').toString();
const REVIEWABLE_STATUSES: MediaStatus[] = ['completed', 'reviewed'];

export default function AddMediaModal({
  open,
  onOpenChange,
  categories,
  mode,
  media,
  initialType = 'movie',
  onSuccess,
}: AddMediaModalProps) {
  const [mediaType, setMediaType] = useState<MediaType>(initialType);
  const [status, setStatus] = useState<MediaStatus>('planned');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [totalSeasons, setTotalSeasons] = useState('');
  const [totalEpisodes, setTotalEpisodes] = useState('');
  const [currentSeason, setCurrentSeason] = useState('');
  const [currentEpisode, setCurrentEpisode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'edit' && media) {
      setMediaType(media.type);
      setStatus(media.status);
      setSelectedCategories(media.categories.map((category) => category.id));
      setCategorySearch('');
      setTitle(media.title);
      setRating(toInputValue(media.rating));
      setNotes(media.notes ?? '');
      setPosterUrl(media.posterUrl ?? '');
      setReleaseYear(toInputValue(media.releaseYear));
      setTotalSeasons(toInputValue(media.totalSeasons));
      setTotalEpisodes(toInputValue(media.totalEpisodes));
      setCurrentSeason(toInputValue(media.currentSeason));
      setCurrentEpisode(toInputValue(media.currentEpisode));
      setError(null);
      return;
    }

    setMediaType(initialType);
    setStatus('planned');
    setSelectedCategories([]);
    setCategorySearch('');
    setTitle('');
    setRating('');
    setNotes('');
    setPosterUrl('');
    setReleaseYear('');
    setTotalSeasons('');
    setTotalEpisodes('');
    setCurrentSeason('');
    setCurrentEpisode('');
    setError(null);
  }, [open, mode, media, initialType]);

  useEffect(() => {
    if (!REVIEWABLE_STATUSES.includes(status)) {
      setRating('');
    }
  }, [status]);

  const selectedCategoryObjects = useMemo(
    () => categories.filter((category) => selectedCategories.includes(category.id)),
    [categories, selectedCategories]
  );

  const groupedCategories = useMemo(() => {
    const grouped = new Map<string, { label: string; categories: Category[] }>();

    for (const category of categories) {
      const key = category.group?.id ?? 'ungrouped';
      const label = category.group?.name ?? 'Ungrouped Categories';
      const existing = grouped.get(key);
      if (existing) {
        existing.categories.push(category);
      } else {
        grouped.set(key, { label, categories: [category] });
      }
    }

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        categories: group.categories.sort((left, right) => left.name.localeCompare(right.name)),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [categories]);

  const filteredGroups = useMemo(() => {
    const query = categorySearch.trim().toLowerCase();

    if (!query) {
      return groupedCategories;
    }

    return groupedCategories
      .map((group) => ({
        ...group,
        categories: group.categories.filter((category) => {
          const inName = category.name.toLowerCase().includes(query);
          const inGroup = group.label.toLowerCase().includes(query);
          return inName || inGroup;
        }),
      }))
      .filter((group) => group.categories.length > 0);
  }, [categorySearch, groupedCategories]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((previous) =>
      previous.includes(categoryId)
        ? previous.filter((value) => value !== categoryId)
        : [...previous, categoryId]
    );
  };

  const parseNullableInteger = (value: string) => {
    if (!value.trim()) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const parseNullableFloat = (value: string) => {
    if (!value.trim()) {
      return null;
    }

    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleOpenChatGpt = () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError('Enter a title first so ChatGPT can suggest the correct name and categories.');
      return;
    }

    const groupedCategoryList = groupedCategories
      .map(
        (group) =>
          `${group.label}: ${group.categories.map((category) => category.name).join(', ')}`
      )
      .join('\n');

    const prompt = [
      `Help me file this ${mediaType} into my personal media tracker.`,
      '',
      `User-entered title: ${trimmedTitle}`,
      `Type: ${mediaType}`,
      '',
      'Use only these website categories:',
      groupedCategoryList,
      '',
      'Tasks:',
      '1. Identify the most likely correct official title for this exact movie or series.',
      '2. Keep the type as movie or series.',
      '3. Pick only the best matching existing categories from the list above.',
      '4. Do not invent new categories.',
      '',
      'Return exactly this format:',
      `Correct Title: <official ${mediaType} title>`,
      'Type: <movie or series>',
      'Categories:',
      '- <category 1>',
      '- <category 2>',
    ].join('\n');

    const url = `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const buildPayload = (): MediaPayload => ({
    title: title.trim(),
    type: mediaType,
    status,
    rating: REVIEWABLE_STATUSES.includes(status) ? parseNullableFloat(rating) : null,
    liked: status === 'reviewed' ? false : status === 'completed' ? true : null,
    notes: notes.trim() ? notes.trim() : null,
    posterUrl: posterUrl.trim() ? posterUrl.trim() : null,
    releaseYear: parseNullableInteger(releaseYear),
    totalSeasons: mediaType === 'series' ? parseNullableInteger(totalSeasons) : null,
    totalEpisodes: mediaType === 'series' ? parseNullableInteger(totalEpisodes) : null,
    currentSeason: mediaType === 'series' ? parseNullableInteger(currentSeason) : null,
    currentEpisode: mediaType === 'series' ? parseNullableInteger(currentEpisode) : null,
    categoryIds: selectedCategories,
  });

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    const parsedRating = REVIEWABLE_STATUSES.includes(status) ? parseNullableFloat(rating) : null;
    if (parsedRating !== null && parsedRating < MIN_ALLOWED_RATING) {
      setError(`Items rated below ${MIN_ALLOWED_RATING} cannot be added.`);
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload = buildPayload();

      if (mode === 'edit' && media) {
        await watchlistApi.updateMediaItem(media.id, payload);
      } else {
        await watchlistApi.createMediaItem(payload);
      }

      onOpenChange(false);
      onSuccess();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto border-border bg-card px-4 sm:px-6">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card pb-5">
          <DialogTitle className="text-xl font-bold text-foreground sm:text-2xl">
            {mode === 'edit' ? 'Edit' : 'Add'} {mediaType === 'movie' ? 'Movie' : 'Series'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          <div>
            <Label className="mb-3 block text-sm font-medium text-foreground">Type</Label>
            <RadioGroup value={mediaType} onValueChange={(value) => setMediaType(value as MediaType)} className="grid grid-cols-2 gap-3">
              <Label htmlFor="movie" className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-3 font-normal">
                <RadioGroupItem value="movie" id="movie" />
                Movie
              </Label>
              <Label htmlFor="series" className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-3 font-normal">
                <RadioGroupItem value="series" id="series" />
                Series
              </Label>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-foreground">Title *</Label>
              <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 bg-secondary" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Opens ChatGPT with your title and your current website categories.
              </p>
              <Button type="button" variant="outline" onClick={handleOpenChatGpt} className="gap-2" disabled={!title.trim()}>
                <Sparkles className="h-4 w-4" />
                Categorize with ChatGPT
              </Button>
            </div>
          </div>

          <div>
            <Label className="mb-3 block text-sm font-medium text-foreground">Status</Label>
            <RadioGroup value={status} onValueChange={(value) => setStatus(value as MediaStatus)} className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[
                ['planned', 'Planned'],
                ['watching', 'Watching'],
                ['suspended', 'Suspended'],
                ['completed', 'Completed'],
                ['reviewed', 'Reviewed / Didn\'t Like'],
              ].map(([value, label]) => (
                <Label key={value} htmlFor={value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-3 text-sm font-normal">
                  <RadioGroupItem value={value} id={value} />
                  {label}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="year" className="text-sm font-medium text-foreground">Release Year</Label>
              <Input id="year" type="number" value={releaseYear} onChange={(event) => setReleaseYear(event.target.value)} className="mt-2 bg-secondary" />
            </div>
            <div>
              <Label htmlFor="poster-url" className="text-sm font-medium text-foreground">Poster URL</Label>
              <Input id="poster-url" value={posterUrl} onChange={(event) => setPosterUrl(event.target.value)} className="mt-2 bg-secondary" />
            </div>
          </div>

          <div>
            <Label htmlFor="rating" className="text-sm font-medium text-foreground">Rating ({MIN_ALLOWED_RATING}-10)</Label>
            <Input
              id="rating"
              type="number"
              min={MIN_ALLOWED_RATING}
              max="10"
              step="0.1"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              className="mt-2 bg-secondary"
              disabled={!REVIEWABLE_STATUSES.includes(status)}
            />
            {!REVIEWABLE_STATUSES.includes(status) ? (
              <p className="mt-2 text-xs text-muted-foreground">Rating unlocks when the item is completed or reviewed.</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Items rated below {MIN_ALLOWED_RATING} cannot be added.</p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label className="text-sm font-medium text-foreground">Categories</Label>
              <Badge variant="secondary">{selectedCategories.length} selected</Badge>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Search categories or groups..."
                className="border-border bg-secondary pl-10"
              />
            </div>

            {selectedCategoryObjects.length > 0 && (
              <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-secondary/60 p-3">
                {selectedCategoryObjects.map((category) => (
                  <Badge key={category.id} variant="secondary" className="gap-1 rounded-full px-3 py-1">
                    {category.name}
                    <button type="button" onClick={() => handleCategoryToggle(category.id)} className="rounded-full p-0.5 hover:bg-black/10">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-border bg-secondary/30 p-3 sm:p-4">
              {filteredGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories match that search.</p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.label} className="space-y-2 rounded-lg border border-border/70 bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{group.label}</p>
                      <span className="text-[11px] text-muted-foreground">{group.categories.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {group.categories.map((category) => {
                        const checked = selectedCategories.includes(category.id);
                        return (
                          <Label
                            key={category.id}
                            htmlFor={category.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-normal transition-colors ${
                              checked ? 'border-indigo-500 bg-indigo-500/10 text-foreground' : 'border-border bg-card/80 text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Checkbox
                              id={category.id}
                              checked={checked}
                              onCheckedChange={() => handleCategoryToggle(category.id)}
                            />
                            <span className="min-w-0 flex-1 truncate">{category.name}</span>
                          </Label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {mediaType === 'series' && (
            <div className="space-y-4 rounded-lg border border-border bg-secondary p-4">
              <p className="text-sm font-medium text-foreground">Series Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="seasons" className="text-sm font-medium text-foreground">Total Seasons</Label>
                  <Input id="seasons" type="number" value={totalSeasons} onChange={(event) => setTotalSeasons(event.target.value)} className="mt-2 bg-background" />
                </div>
                <div>
                  <Label htmlFor="episodes" className="text-sm font-medium text-foreground">Total Episodes</Label>
                  <Input id="episodes" type="number" value={totalEpisodes} onChange={(event) => setTotalEpisodes(event.target.value)} className="mt-2 bg-background" />
                </div>
                <div>
                  <Label htmlFor="current-season" className="text-sm font-medium text-foreground">Current Season</Label>
                  <Input id="current-season" type="number" value={currentSeason} onChange={(event) => setCurrentSeason(event.target.value)} className="mt-2 bg-background" />
                </div>
                <div>
                  <Label htmlFor="current-episode" className="text-sm font-medium text-foreground">Current Episode</Label>
                  <Input id="current-episode" type="number" value={currentEpisode} onChange={(event) => setCurrentEpisode(event.target.value)} className="mt-2 bg-background" />
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes" className="text-sm font-medium text-foreground">Notes</Label>
            <Textarea id="notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 resize-none bg-secondary" />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row">
            <Button onClick={handleSubmit} className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={isSaving}>
              {isSaving ? 'Saving...' : mode === 'edit' ? 'Update Item' : `Add ${mediaType === 'movie' ? 'Movie' : 'Series'}`}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
