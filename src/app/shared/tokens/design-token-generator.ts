/**
 * Design Token Generator
 * Generates the complete CSS custom properties for the design system
 * Run this to generate CSS that can be included in styles.scss
 */

import { generateCSSCustomProperties } from './design-token-css';

/**
 * Complete CSS custom properties for the design system
 * This should be included in the :root selector of styles.scss
 */
export const DESIGN_SYSTEM_CSS = `:root {
  ${generateCSSCustomProperties()}
}`;

/**
 * Utility to write the CSS to console for copy/paste
 * Useful during development to update the main stylesheet
 */
export function logDesignSystemCSS(): void {
  console.log(DESIGN_SYSTEM_CSS);
}

/**
 * Size system mapping for components
 * Maps the new xs/sm/md/lg/xl system to existing numeric system for migration
 */
export const SIZE_MIGRATION_MAP = {
  // Button legacy mapping: '1' | '2' | '3' -> xs/sm/md/lg/xl
  button: {
    '1': 'xs',  // Legacy size 1 -> xs
    '2': 'sm',  // Legacy size 2 -> sm  
    '3': 'md'   // Legacy size 3 -> md
  },
  
  // Badge legacy mapping: 'sm' | 'md' -> xs/sm/md/lg/xl
  badge: {
    'sm': 'sm',  // Keep sm as sm
    'md': 'md'   // Keep md as md
  },
  
  // Status indicator already uses xs/sm/md/lg - no mapping needed
  statusIndicator: {
    'xs': 'xs',
    'sm': 'sm', 
    'md': 'md',
    'lg': 'lg'
  }
} as const;

/**
 * Color variant mapping for semantic color names
 * Maps component-specific color variants to semantic color tokens
 */
export const COLOR_VARIANT_MAP = {
  // Standard color variants used across components
  variants: {
    'gray': 'neutral',
    'blue': 'primary', 
    'green': 'success',
    'red': 'danger',
    'amber': 'warning',
    'orange': 'warning',
    'purple': 'info'
  },
  
  // Semantic state colors
  states: {
    'idle': 'neutral',
    'loading': 'primary', 
    'success': 'success',
    'error': 'danger',
    'warning': 'warning'
  }
} as const;