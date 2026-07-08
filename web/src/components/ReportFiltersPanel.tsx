import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ReportFacets, ReportFilters } from '@shared/types';
import { fetchFacets, filtersFromSearchParams, searchParamsFromFilters } from '../api';
import ActiveFilterChips, { hasActiveFilters } from './ActiveFilterChips';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface ReportFiltersPanelProps {
  onChange: (filters: ReportFilters) => void;
}

type QuickPreset = 'all' | 'node' | 'python' | 'failed' | '7d' | '30d';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function activePreset(filters: ReportFilters): QuickPreset | null {
  if (filters.tags?.length === 1 && filters.tags[0] === 'node' && !filters.status && !filters.from) {
    return 'node';
  }
  if (filters.tags?.length === 1 && filters.tags[0] === 'python' && !filters.status && !filters.from) {
    return 'python';
  }
  if (filters.status === 'failed' && !filters.tags?.length && !filters.from) {
    return 'failed';
  }
  if (filters.from && !filters.tags?.length && !filters.status) {
    const fromDate = new Date(filters.from);
    const now = new Date();
    const diffDays = Math.round((now.getTime() - fromDate.getTime()) / 86_400_000);
    if (diffDays >= 6 && diffDays <= 8) return '7d';
    if (diffDays >= 29 && diffDays <= 31) return '30d';
  }
  return null;
}

export default function ReportFiltersPanel({ onChange }: ReportFiltersPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [facets, setFacets] = useState<ReportFacets | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const filters = filtersFromSearchParams(searchParams);
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const updateFilters = useCallback(
    (next: ReportFilters) => {
      setSearchParams(searchParamsFromFilters(next));
      onChange(next);
    },
    [onChange, setSearchParams],
  );

  useEffect(() => {
    fetchFacets({ project: filters.project, from: filters.from, to: filters.to })
      .then(setFacets)
      .catch(() => setFacets(null));
  }, [filters.project, filters.from, filters.to]);

  useEffect(() => {
    onChange(filtersFromSearchParams(searchParams));
  }, [searchParams, onChange]);

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    const current = filters.search ?? '';
    if (trimmed !== current) {
      updateFilters({ ...filters, search: trimmed || undefined });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasActiveFilters(filters) && (filters.framework || filters.project || filters.tagMode === 'all')) {
      setAdvancedOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTag(tag: string) {
    const current = filters.tags ?? [];
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    updateFilters({ ...filters, tags: next.length ? next : undefined, tagMode: next.length ? filters.tagMode : undefined });
  }

  function clearFilters() {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  }

  function applyPreset(preset: QuickPreset) {
    setSearchInput('');
    switch (preset) {
      case 'all':
        setSearchParams(new URLSearchParams());
        break;
      case 'node':
        updateFilters({ tags: ['node'] });
        break;
      case 'python':
        updateFilters({ tags: ['python'] });
        break;
      case 'failed':
        updateFilters({ status: 'failed' });
        break;
      case '7d':
        updateFilters({ from: isoDaysAgo(7) });
        break;
      case '30d':
        updateFilters({ from: isoDaysAgo(30) });
        break;
    }
  }

  const preset = activePreset(filters);

  return (
    <div className="filters-panel">
      <div className="filters-search-row">
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder="Search by label, project, framework, or tag…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search reports"
          />
          {searchInput && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="filters-quick">
        <span className="filters-quick-label">Quick filters</span>
        <div className="quick-presets">
          {([
            ['all', 'All runs'],
            ['node', 'Node.js'],
            ['python', 'Python'],
            ['failed', 'Failed only'],
            ['7d', 'Last 7 days'],
            ['30d', 'Last 30 days'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`quick-preset${preset === key ? ' active' : ''}`}
              onClick={() => applyPreset(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ActiveFilterChips filters={filters} onUpdate={updateFilters} onClear={clearFilters} />

      <div className="filters-advanced">
        <button
          type="button"
          className="filters-advanced-toggle"
          onClick={() => setAdvancedOpen((o) => !o)}
          aria-expanded={advancedOpen}
        >
          <span>Advanced filters</span>
          <svg
            className={`chevron${advancedOpen ? ' open' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {advancedOpen && (
          <div className="filters-advanced-body">
            <div className="filters-grid">
              <label className="filter-field">
                <span>Project</span>
                <select
                  value={filters.project ?? ''}
                  onChange={(e) =>
                    updateFilters({ ...filters, project: e.target.value || undefined })
                  }
                >
                  <option value="">All projects</option>
                  {facets?.projects.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.value} ({p.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Framework</span>
                <select
                  value={filters.framework ?? ''}
                  onChange={(e) =>
                    updateFilters({ ...filters, framework: e.target.value || undefined })
                  }
                >
                  <option value="">All frameworks</option>
                  {facets?.frameworks.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.value} ({f.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Status</span>
                <select
                  value={filters.status ?? ''}
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      status: (e.target.value as 'passed' | 'failed') || undefined,
                    })
                  }
                >
                  <option value="">Any status</option>
                  <option value="passed">Passed only</option>
                  <option value="failed">Failed only</option>
                </select>
              </label>

              <label className="filter-field">
                <span>From date</span>
                <input
                  type="date"
                  value={filters.from?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      from: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined,
                    })
                  }
                />
              </label>

              <label className="filter-field">
                <span>To date</span>
                <input
                  type="date"
                  value={filters.to?.slice(0, 10) ?? ''}
                  onChange={(e) =>
                    updateFilters({
                      ...filters,
                      to: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined,
                    })
                  }
                />
              </label>
            </div>

            {facets && facets.tags.length > 0 && (
              <div className="filters-tags-section">
                <div className="filters-tags-header">
                  <span className="filters-tags-label">Tags</span>
                  {filters.tags && filters.tags.length > 1 && (
                    <div className="tag-mode-toggle" role="group" aria-label="Tag match mode">
                      <button
                        type="button"
                        className={filters.tagMode !== 'all' ? 'active' : ''}
                        onClick={() => updateFilters({ ...filters, tagMode: undefined })}
                      >
                        Match any
                      </button>
                      <button
                        type="button"
                        className={filters.tagMode === 'all' ? 'active' : ''}
                        onClick={() => updateFilters({ ...filters, tagMode: 'all' })}
                      >
                        Match all
                      </button>
                    </div>
                  )}
                </div>
                <p className="filters-tags-hint">
                  {filters.tagMode === 'all'
                    ? 'Show runs that have every selected tag.'
                    : 'Show runs that have at least one selected tag.'}
                </p>
                <div className="tag-list">
                  {facets.tags.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      className={`tag-chip ${filters.tags?.includes(tag.value) ? 'active' : ''}`}
                      onClick={() => toggleTag(tag.value)}
                    >
                      {tag.value}
                      <span className="tag-count">{tag.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
