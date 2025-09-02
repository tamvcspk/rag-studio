/**
 * Type definitions for RagStatsOverview component
 */

export interface StatItem {
  /** Unique identifier for the stat item */
  id: string;
  /** Display label for the statistic */
  label: string;
  /** The statistical value (number or string) */
  value: number | string;
  /** Lucide icon component for the stat */
  icon: any;
  /** Color scheme for the stat display */
  color?: 'gray' | 'green' | 'red' | 'amber' | 'blue';
  /** Visual variant for the chip display */
  variant?: 'solid' | 'soft' | 'outline';
  /** Whether the stat item is clickable (default: true) */
  clickable?: boolean;
}