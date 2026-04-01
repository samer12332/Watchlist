'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { watchlistApi } from '@/lib/api';
import type { CategoryGroup } from '@/shared/watchlist';

interface EditCategoryGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  group?: CategoryGroup | null;
  onSuccess: () => void;
}

export default function EditCategoryGroupModal({
  open,
  onOpenChange,
  mode,
  group,
  onSuccess,
}: EditCategoryGroupModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(group?.name ?? '');
    setColor(group?.color ?? '');
    setDescription(group?.description ?? '');
    setError(null);
  }, [open, group]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        color: color.trim() ? color.trim() : null,
        description: description.trim() ? description.trim() : null,
      };

      if (mode === 'edit' && group) {
        await watchlistApi.updateCategoryGroup(group.id, payload);
      } else {
        await watchlistApi.createCategoryGroup(payload);
      }

      onOpenChange(false);
      onSuccess();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this group.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {mode === 'add' ? 'Add Category Group' : 'Edit Category Group'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="group-name" className="text-sm font-medium text-foreground">
              Group Name
            </Label>
            <Input id="group-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 bg-secondary" autoFocus />
          </div>

          <div>
            <Label htmlFor="group-color" className="text-sm font-medium text-foreground">
              Color
            </Label>
            <Input id="group-color" placeholder="#6366f1" value={color} onChange={(event) => setColor(event.target.value)} className="mt-2 bg-secondary" />
          </div>

          <div>
            <Label htmlFor="group-description" className="text-sm font-medium text-foreground">
              Description
            </Label>
            <Textarea id="group-description" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 resize-none bg-secondary" />
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              {isSaving ? 'Saving...' : mode === 'add' ? 'Add Group' : 'Update Group'}
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
