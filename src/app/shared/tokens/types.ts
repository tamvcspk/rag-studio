/**
 * Type definitions for the design system
 * Provides type safety for all design tokens and component props
 */

// ===== SIZE SYSTEM TYPES =====

/** Standard size scale used across all components */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Legacy size mappings for migration */
export type LegacyButtonSize = '1' | '2' | '3';
export type LegacyBadgeSize = 'sm' | 'md';

// ===== COLOR SYSTEM TYPES =====

/** Available color names in the palette */
export type ColorName = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'orange' | 'purple';

/** Color scale steps */
export type ColorScale = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 | 1000;

/** Full color reference with scale */
export type ColorReference = `${ColorName}.${ColorScale}`;

/** Semantic color intentions */
export type SemanticColor = 'primary' | 'success' | 'warning' | 'danger' | 'error' | 'info' | 'neutral';

/** Status color variants */
export type StatusColor = 'idle' | 'loading' | 'success' | 'error' | 'warning';

// ===== COMPONENT VARIANT TYPES =====

/** Button variants */
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';

/** Badge variants */
export type BadgeVariant = 'solid' | 'soft' | 'outline';

/** Button types */
export type ButtonType = 'button' | 'submit' | 'reset';

// ===== COMPONENT PROP TYPES =====

/** Button component props */
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  type?: ButtonType;
  fullWidth?: boolean;
}

/** Badge component props */
export interface BadgeProps {
  variant?: BadgeVariant;
  color?: ColorName;
  size?: Size;
  icon?: string;
  dot?: boolean;
}

/** Status indicator component props */
export interface StatusIndicatorProps {
  status?: StatusColor;
  size?: Size;
  showIcon?: boolean;
  showLabel?: boolean;
  label?: string;
  pulse?: boolean;
}

// ===== DESIGN TOKEN TYPES =====

/** Spacing token keys */
export type SpacingToken = keyof typeof import('./design-tokens').PrimitiveTokens.spacing;

/** Border radius token keys */
export type RadiusToken = keyof typeof import('./design-tokens').PrimitiveTokens.radius;

/** Typography size token keys */
export type FontSizeToken = keyof typeof import('./design-tokens').PrimitiveTokens.fontSize;

/** Shadow token keys */
export type ShadowToken = keyof typeof import('./design-tokens').PrimitiveTokens.shadow;

// ===== UTILITY TYPES =====

/** CSS custom property name */
export type CSSCustomProperty = `--${string}`;

/** Design token path for accessing nested properties */
export type TokenPath = string;

/** Component size configuration */
export interface ComponentSizeConfig {
  height: string;
  padding: string;
  fontSize: string;
  borderRadius: string;
}

/** Color variant configuration */
export interface ColorVariantConfig {
  background: string;
  color: string;
  border?: string;
}

// ===== THEME TYPES =====

/** Theme mode */
export type ThemeMode = 'light' | 'dark';

/** Color scheme preference */
export type ColorScheme = 'system' | 'light' | 'dark';

// ===== VALIDATION TYPES =====

/** Valid component size values */
export const VALID_SIZES: readonly Size[] = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

/** Valid color names */
export const VALID_COLORS: readonly ColorName[] = [
  'gray', 'blue', 'green', 'red', 'amber', 'orange', 'purple'
] as const;

/** Valid button variants */
export const VALID_BUTTON_VARIANTS: readonly ButtonVariant[] = [
  'solid', 'outline', 'ghost', 'soft'
] as const;

/** Valid badge variants */
export const VALID_BADGE_VARIANTS: readonly BadgeVariant[] = [
  'solid', 'soft', 'outline'
] as const;

/** Valid status colors */
export const VALID_STATUS_COLORS: readonly StatusColor[] = [
  'idle', 'loading', 'success', 'error', 'warning'
] as const;

// ===== TYPE GUARDS =====

/** Type guard for Size */
export function isValidSize(value: unknown): value is Size {
  return typeof value === 'string' && VALID_SIZES.includes(value as Size);
}

/** Type guard for ColorName */
export function isValidColorName(value: unknown): value is ColorName {
  return typeof value === 'string' && VALID_COLORS.includes(value as ColorName);
}

/** Type guard for ButtonVariant */
export function isValidButtonVariant(value: unknown): value is ButtonVariant {
  return typeof value === 'string' && VALID_BUTTON_VARIANTS.includes(value as ButtonVariant);
}

/** Type guard for StatusColor */
export function isValidStatusColor(value: unknown): value is StatusColor {
  return typeof value === 'string' && VALID_STATUS_COLORS.includes(value as StatusColor);
}