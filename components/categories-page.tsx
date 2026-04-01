'use client';

import { useEffect, useMemo, useState } from 'react';
import { Edit2, FolderTree, Plus, Tag, Trash2 } from 'lucide-react';

import EditCategoryGroupModal from '@/components/edit-category-group-modal';
import EditCategoryModal from '@/components/edit-category-modal';
import PaginationControls from '@/components/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { watchlistApi } from '@/lib/api';
import type { Category, CategoryGroup, MediaItem } from '@/shared/watchlist';

interface CategoriesPageProps {
  refreshToken: number;
  onDataChanged: () => void;
}

const GROUPS_PAGE_SIZE = 6;
const CATEGORIES_PAGE_SIZE = 12;

export default function CategoriesPage({ refreshToken, onDataChanged }: CategoriesPageProps) {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [groupsPage, setGroupsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [groupData, categoryData, mediaResponse] = await Promise.all([
          watchlistApi.listCategoryGroups(),
          watchlistApi.listCategories(),
          watchlistApi.listMedia({ sortBy: 'rating', sortOrder: 'desc' }),
        ]);

        if (!active) {
          return;
        }

        setGroups(groupData);
        setCategories(categoryData);
        setMediaItems(mediaResponse.data);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load categories.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [refreshToken]);

  const categoryStats = useMemo(() => {
    return categories
      .map((category) => {
        const matches = mediaItems.filter((item) => item.categories.some((entry) => entry.id === category.id));

        return {
          category,
          count: matches.length,
          topMedia: [...matches].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 2),
          completedCount: matches.filter((item) => item.status === 'completed').length,
          reviewedCount: matches.filter((item) => item.status === 'reviewed').length,
          watchingCount: matches.filter((item) => item.status === 'watching').length,
          plannedCount: matches.filter((item) => item.status === 'planned').length,
          suspendedCount: matches.filter((item) => item.status === 'suspended').length,
        };
      })
      .sort((left, right) => right.count - left.count || left.category.name.localeCompare(right.category.name));
  }, [categories, mediaItems]);

  const totalGroupPages = Math.max(1, Math.ceil(groups.length / GROUPS_PAGE_SIZE));
  const totalCategoryPages = Math.max(1, Math.ceil(categoryStats.length / CATEGORIES_PAGE_SIZE));

  useEffect(() => {
    setGroupsPage((current) => Math.min(current, totalGroupPages));
  }, [totalGroupPages]);

  useEffect(() => {
    setCategoriesPage((current) => Math.min(current, totalCategoryPages));
  }, [totalCategoryPages]);

  const paginatedGroups = useMemo(() => {
    const start = (groupsPage - 1) * GROUPS_PAGE_SIZE;
    return groups.slice(start, start + GROUPS_PAGE_SIZE);
  }, [groups, groupsPage]);

  const paginatedCategoryStats = useMemo(() => {
    const start = (categoriesPage - 1) * CATEGORIES_PAGE_SIZE;
    return categoryStats.slice(start, start + CATEGORIES_PAGE_SIZE);
  }, [categoryStats, categoriesPage]);

  const paginatedGroupedStats = useMemo(() => {
    const mapped = groups
      .map((group) => ({
        group,
        categories: paginatedCategoryStats.filter((entry) => entry.category.group?.id === group.id),
      }))
      .filter((entry) => entry.categories.length > 0);

    const ungrouped = paginatedCategoryStats.filter((entry) => entry.category.group === null);

    return { mapped, ungrouped };
  }, [groups, paginatedCategoryStats]);

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(`Delete category "${category.name}"? Media items will be kept.`);

    if (!confirmed) {
      return;
    }

    try {
      await watchlistApi.deleteCategory(category.id);
      onDataChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this category.');
    }
  };

  const handleDeleteGroup = async (group: CategoryGroup) => {
    const confirmed = window.confirm(`Delete group "${group.name}"? Categories will remain but become ungrouped.`);

    if (!confirmed) {
      return;
    }

    try {
      await watchlistApi.deleteCategoryGroup(group.id);
      onDataChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this group.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categories</h1>
          <p className="mt-1 text-muted-foreground">{categories.length} categories across {groups.length} groups</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddGroupModal(true)} variant="outline" className="gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Add Group</span>
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Category</span>
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading categories...</Card>
      ) : error ? (
        <Card className="p-12 text-center text-red-300">{error}</Card>
      ) : (
        <>
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Category Groups</h2>
              <Badge variant="secondary">{groups.length}</Badge>
            </div>
            {groups.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No category groups yet. Create one to organize your categories.</Card>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedGroups.map((group) => {
                    const groupCategories = categoryStats.filter((entry) => entry.category.group?.id === group.id);

                    return (
                      <Card key={group.id} className="border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color ?? '#6366f1' }} />
                              <h3 className="text-base font-semibold text-foreground">{group.name}</h3>
                            </div>
                            {group.description && <p className="mt-2 text-sm text-muted-foreground">{group.description}</p>}
                            <p className="mt-3 text-sm text-muted-foreground">{groupCategories.length} categor{groupCategories.length === 1 ? 'y' : 'ies'}</p>
                          </div>
                          <FolderTree className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {groupCategories.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No categories assigned yet.</span>
                          ) : (
                            groupCategories.map((entry) => (
                              <Badge key={entry.category.id} variant="secondary" className="text-[11px]">{entry.category.name}</Badge>
                            ))
                          )}
                        </div>
                        <div className="mt-4 flex gap-2 border-t border-border pt-4">
                          <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => setEditingGroup(group)}>
                            <Edit2 className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 gap-2 text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteGroup(group)}>
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                <PaginationControls
                  currentPage={groupsPage}
                  totalPages={totalGroupPages}
                  totalItems={groups.length}
                  pageSize={GROUPS_PAGE_SIZE}
                  itemLabel="groups"
                  onPageChange={setGroupsPage}
                />
              </>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">Categories</h2>
              <Badge variant="secondary">{categories.length}</Badge>
            </div>
            {categoryStats.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">No categories yet. Add one to get started.</Card>
            ) : (
              <>
                <div className="space-y-8">
                  {paginatedGroupedStats.mapped.map(({ group, categories: items }) => (
                    <div key={group.id} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: group.color ?? '#6366f1' }} />
                        <h3 className="text-lg font-semibold text-foreground">{group.name}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {items.map((entry) => (
                          <CategoryCard
                            key={entry.category.id}
                            category={entry.category}
                            count={entry.count}
                            topMedia={entry.topMedia}
                            completedCount={entry.completedCount}
                            reviewedCount={entry.reviewedCount}
                            watchingCount={entry.watchingCount}
                            plannedCount={entry.plannedCount}
                            suspendedCount={entry.suspendedCount}
                            onEdit={setEditingCategory}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))}

                  {paginatedGroupedStats.ungrouped.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">Ungrouped Categories</h3>
                      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        {paginatedGroupedStats.ungrouped.map((entry) => (
                          <CategoryCard
                            key={entry.category.id}
                            category={entry.category}
                            count={entry.count}
                            topMedia={entry.topMedia}
                            completedCount={entry.completedCount}
                            reviewedCount={entry.reviewedCount}
                            watchingCount={entry.watchingCount}
                            plannedCount={entry.plannedCount}
                            suspendedCount={entry.suspendedCount}
                            onEdit={setEditingCategory}
                            onDelete={handleDelete}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <PaginationControls
                  currentPage={categoriesPage}
                  totalPages={totalCategoryPages}
                  totalItems={categoryStats.length}
                  pageSize={CATEGORIES_PAGE_SIZE}
                  itemLabel="categories"
                  onPageChange={setCategoriesPage}
                />
              </>
            )}
          </section>
        </>
      )}

      <EditCategoryGroupModal open={showAddGroupModal} onOpenChange={setShowAddGroupModal} mode="add" onSuccess={onDataChanged} />
      <EditCategoryGroupModal
        open={Boolean(editingGroup)}
        onOpenChange={(open) => !open && setEditingGroup(null)}
        mode="edit"
        group={editingGroup}
        onSuccess={() => {
          setEditingGroup(null);
          onDataChanged();
        }}
      />
      <EditCategoryModal open={showAddModal} onOpenChange={setShowAddModal} mode="add" groups={groups} onSuccess={onDataChanged} />
      <EditCategoryModal
        open={Boolean(editingCategory)}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        mode="edit"
        category={editingCategory}
        groups={groups}
        onSuccess={() => {
          setEditingCategory(null);
          onDataChanged();
        }}
      />
    </div>
  );
}

interface CategoryCardProps {
  category: Category;
  count: number;
  topMedia: MediaItem[];
  completedCount: number;
  reviewedCount: number;
  watchingCount: number;
  plannedCount: number;
  suspendedCount: number;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function CategoryCard({
  category,
  count,
  topMedia,
  completedCount,
  reviewedCount,
  watchingCount,
  plannedCount,
  suspendedCount,
  onEdit,
  onDelete,
}: CategoryCardProps) {
  const fallbackGradients = [
    'from-indigo-500 to-purple-600',
    'from-purple-500 to-pink-600',
    'from-pink-500 to-rose-600',
    'from-blue-500 to-cyan-600',
    'from-cyan-500 to-teal-600',
    'from-green-500 to-emerald-600',
    'from-yellow-500 to-orange-600',
    'from-orange-500 to-red-600',
  ];

  const gradientClass = fallbackGradients[category.name.charCodeAt(0) % fallbackGradients.length];

  return (
    <Card className="group overflow-hidden border-border transition-colors hover:border-indigo-500/50">
      <div
        className={`relative h-16 bg-gradient-to-br ${gradientClass}`}
        style={category.color ? { backgroundImage: `linear-gradient(135deg, ${category.color}, #111827)` } : undefined}
      >
        <div className="absolute inset-0 bg-grid-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="line-clamp-2 text-sm font-bold text-foreground sm:text-base">{category.name}</h3>
              {category.group && <Badge variant="secondary" className="hidden text-[10px] sm:inline-flex">{category.group.name}</Badge>}
            </div>
            <p className="mt-1 text-xl font-bold text-indigo-400 sm:text-2xl">{count}</p>
            <p className="text-[11px] text-muted-foreground">{count === 1 ? 'item' : 'items'}</p>
          </div>
          <Tag className="h-6 w-6 text-muted-foreground opacity-50" />
        </div>

        {topMedia.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Top Rated</p>
            <div className="space-y-1">
              {topMedia.map((media) => (
                <div key={media.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-foreground">{media.title}</span>
                  {media.rating !== null && <span className="flex-shrink-0 font-medium text-yellow-500">{media.rating}/10</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-[10px]">{completedCount} completed</Badge>
          <Badge variant="secondary" className="text-[10px]">{reviewedCount} reviewed</Badge>
          <Badge variant="secondary" className="text-[10px]">{watchingCount} watching</Badge>
          <Badge variant="secondary" className="text-[10px]">{plannedCount} planned</Badge>
          <Badge variant="secondary" className="text-[10px]">{suspendedCount} suspended</Badge>
        </div>

        <div className="flex gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" onClick={() => onEdit(category)} className="flex-1 gap-2 text-xs">
            <Edit2 className="h-3 w-3" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2 text-xs text-red-400 hover:bg-red-500/10" onClick={() => onDelete(category)}>
            <Trash2 className="h-3 w-3" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
