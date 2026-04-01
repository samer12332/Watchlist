'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { watchlistApi } from '@/lib/api';
import type { Category, CategoryGroup } from '@/shared/watchlist';

interface EditCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  category?: Category | null;
  groups: CategoryGroup[];
  onSuccess: () => void;
}

export default function EditCategoryModal({
  open,
  onOpenChange,
  mode,
  category,
  groups,
  onSuccess,
}: EditCategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [groupId, setGroupId] = useState<string>('none');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(category?.name ?? '');
    setColor(category?.color ?? '');
    setGroupId(category?.group?.id ?? 'none');
    setError(null);
  }, [open, category]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      const payload = {
        name: name.trim(),
        color: color.trim() ? color.trim() : null,
        groupId: groupId === 'none' ? null : groupId,
      };

      if (mode === 'edit' && category) {
        await watchlistApi.updateCategory(category.id, payload);
      } else {
        await watchlistApi.createCategory(payload);
      }

      onOpenChange(false);
      onSuccess();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this category.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {mode === 'add' ? 'Add New Category' : 'Edit Category'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <Label htmlFor="cat-name" className="text-sm font-medium text-foreground">
              Category Name
            </Label>
            <Input id="cat-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 bg-secondary" autoFocus />
          </div>

          <div>
            <Label htmlFor="cat-color" className="text-sm font-medium text-foreground">
              Color
            </Label>
            <Input id="cat-color" placeholder="#6366f1" value={color} onChange={(event) => setColor(event.target.value)} className="mt-2 bg-secondary" />
          </div>

          <div>
            <Label className="text-sm font-medium text-foreground">Category Group</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="mt-2 border-border bg-secondary">
                <SelectValue placeholder="Choose a group" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                <SelectItem value="none">No group</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={isSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              {isSaving ? 'Saving...' : mode === 'add' ? 'Add Category' : 'Update Category'}
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
