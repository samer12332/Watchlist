'use client';

import { useState } from 'react';
import { Grid3x3, Play, Tag } from 'lucide-react';

import CategoriesPage from '@/components/categories-page';
import Dashboard from '@/components/dashboard';
import MediaLibrary from '@/components/media-library';
import { Button } from '@/components/ui/button';

type Page = 'dashboard' | 'library' | 'categories';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [refreshToken, setRefreshToken] = useState(0);

  const handleDataChanged = () => {
    setRefreshToken((value) => value + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="sm:hidden">
                <div className="h-10 w-10 overflow-hidden rounded-md">
                  <img
                    src="/watchlist-logo.png"
                    alt="Watchlist"
                    className="h-full max-w-none object-cover object-left"
                  />
                </div>
              </div>
              <img
                src="/watchlist-logo.png"
                alt="Watchlist"
                className="hidden h-10 w-auto rounded-md object-contain sm:block sm:h-12"
              />
            </div>
            <nav className="flex items-center gap-2">
              <Button
                variant={currentPage === 'dashboard' ? 'default' : 'outline'}
                onClick={() => setCurrentPage('dashboard')}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant={currentPage === 'library' ? 'default' : 'outline'}
                onClick={() => setCurrentPage('library')}
                className="gap-2"
              >
                <Grid3x3 className="h-4 w-4" />
                <span className="hidden sm:inline">Library</span>
              </Button>
              <Button
                variant={currentPage === 'categories' ? 'default' : 'outline'}
                onClick={() => setCurrentPage('categories')}
                className="gap-2"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Categories</span>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {currentPage === 'dashboard' && (
          <Dashboard refreshToken={refreshToken} onDataChanged={handleDataChanged} />
        )}
        {currentPage === 'library' && (
          <MediaLibrary refreshToken={refreshToken} onDataChanged={handleDataChanged} />
        )}
        {currentPage === 'categories' && (
          <CategoriesPage refreshToken={refreshToken} onDataChanged={handleDataChanged} />
        )}
      </main>
    </div>
  );
}
