import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// Components
import { RagIcon } from '../../../atomic/primitives/rag-icon/rag-icon';
import { RagSpinner } from '../../../atomic/primitives/rag-spinner/rag-spinner';
import { RagOverflowBar } from '../../../atomic/primitives/rag-overflow-bar/rag-overflow-bar';

// Types
import { StatItem } from './rag-stats-overview.types';

@Component({
  selector: 'rag-stats-overview',
  standalone: true,
  imports: [
    CommonModule,
    RagIcon,
    RagSpinner,
    RagOverflowBar
  ],
  templateUrl: './rag-stats-overview.html',
  styleUrl: './rag-stats-overview.scss'
})
export class RagStatsOverview {
  // Input properties
  readonly stats = input.required<StatItem[]>();
  readonly loading = input<boolean>(false);

  // Output events
  readonly filterChange = output<string[]>();
  readonly statClick = output<string>();

  // Internal state for multiple selected filters
  private readonly selectedFilters = signal<string[]>([]);

  // Computed visible stats (filter out stats with 0 values except total and first stat)
  readonly visibleStats = computed(() => {
    const allStats = this.stats();
    if (allStats.length === 0) return [];

    return allStats.filter((stat, index) => {
      // Always show first stat (typically total)
      if (index === 0) return true;
      // Always show stats with ID 'total'
      if (stat.id === 'total') return true;
      // Show other stats only if they have non-zero values
      return Number(stat.value) > 0;
    });
  });

  // Event handlers
  onStatClick(statId: string) {
    const stat = this.stats().find(s => s.id === statId);
    if (!stat) return;

    // Handle total stat click - clear all filters
    if (stat.id === 'total') {
      this.selectedFilters.set([]);
      this.filterChange.emit([]);
      return;
    }

    // Handle non-clickable stats
    if (stat.clickable === false) return;

    // Toggle filter selection
    const currentFilters = this.selectedFilters();
    const isSelected = currentFilters.includes(statId);
    
    if (isSelected) {
      // Remove from selection
      const newFilters = currentFilters.filter(id => id !== statId);
      this.selectedFilters.set(newFilters);
      this.filterChange.emit(newFilters);
    } else {
      // Add to selection
      const newFilters = [...currentFilters, statId];
      this.selectedFilters.set(newFilters);
      this.filterChange.emit(newFilters);
    }
    
    this.statClick.emit(statId);
  }

  // Helper to determine if stat item should be clickable
  isStatClickable(stat: StatItem): boolean {
    return stat.clickable !== false;
  }

  // Helper to determine if stat is selected
  isStatSelected(statId: string): boolean {
    return this.selectedFilters().includes(statId);
  }

  // Helper to get icon background color based on stat
  getStatIconColor(stat: StatItem): string {
    // Use stat color if available, otherwise use default based on status
    if (stat.color) {
      const colorMap: Record<string, string> = {
        'blue': 'var(--rag-primitive-color-blue-500)',
        'green': 'var(--rag-primitive-color-green-700)',
        'red': 'var(--rag-primitive-color-red-700)',
        'amber': 'var(--rag-primitive-color-amber-700)',
        'gray': 'var(--rag-primitive-color-gray-700)',
      };
      return colorMap[stat.color] || 'var(--rag-primitive-color-gray-700)';
    }
    
    // Default color
    return 'var(--rag-primitive-color-gray-700)';
  }
}