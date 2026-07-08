import type { ReportFilters } from '@shared/types';
import { searchParamsFromFilters } from '../api';

interface ActiveFilterChipsProps {
  filters: ReportFilters;
  onUpdate: (filters: ReportFilters) => void;
  onClear: () => void;
}

function formatLabel(key: string, value: string): string {
  if (key === 'from') return `From ${value.slice(0, 10)}`;
  if (key === 'to') return `To ${value.slice(0, 10)}`;
  if (key === 'status') return value === 'passed' ? 'Passed runs' : 'Failed runs';
  if (key === 'tagMode') return value === 'all' ? 'Tags: match all' : 'Tags: match any';
  if (key === 'search') return `Search: "${value}"`;
  return `${key}: ${value}`;
}

export default function ActiveFilterChips({ filters, onUpdate, onClear }: ActiveFilterChipsProps) {
  const chips: Array<{ key: string; label: string; remove: () => void }> = [];

  if (filters.project) {
    chips.push({
      key: 'project',
      label: `Project: ${filters.project}`,
      remove: () => onUpdate({ ...filters, project: undefined }),
    });
  }
  if (filters.framework) {
    chips.push({
      key: 'framework',
      label: `Framework: ${filters.framework}`,
      remove: () => onUpdate({ ...filters, framework: undefined }),
    });
  }
  if (filters.status) {
    chips.push({
      key: 'status',
      label: formatLabel('status', filters.status),
      remove: () => onUpdate({ ...filters, status: undefined }),
    });
  }
  if (filters.from) {
    chips.push({
      key: 'from',
      label: formatLabel('from', filters.from),
      remove: () => onUpdate({ ...filters, from: undefined }),
    });
  }
  if (filters.to) {
    chips.push({
      key: 'to',
      label: formatLabel('to', filters.to),
      remove: () => onUpdate({ ...filters, to: undefined }),
    });
  }
  if (filters.search) {
    chips.push({
      key: 'search',
      label: formatLabel('search', filters.search),
      remove: () => onUpdate({ ...filters, search: undefined }),
    });
  }
  if (filters.tags?.length) {
    chips.push({
      key: 'tags',
      label: `Tags: ${filters.tags.join(', ')}`,
      remove: () => onUpdate({ ...filters, tags: undefined, tagMode: undefined }),
    });
  }
  if (filters.tagMode === 'all' && filters.tags?.length) {
    // already covered in tags chip
  }

  if (chips.length === 0) return null;

  return (
    <div className="active-filters">
      <span className="active-filters-label">Active filters</span>
      <div className="active-filters-chips">
        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            className="filter-chip"
            onClick={chip.remove}
            title="Remove filter"
          >
            {chip.label}
            <span className="filter-chip-remove" aria-hidden>×</span>
          </button>
        ))}
        <button type="button" className="filter-chip clear" onClick={onClear}>
          Clear all
        </button>
      </div>
    </div>
  );
}

export function hasActiveFilters(filters: ReportFilters): boolean {
  return Boolean(
    filters.project ||
      filters.framework ||
      filters.status ||
      filters.from ||
      filters.to ||
      filters.search ||
      filters.tags?.length,
  );
}

export { searchParamsFromFilters };
