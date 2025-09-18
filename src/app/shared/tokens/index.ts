/**
 * RAG Studio Design Tokens - Main Export
 * 
 * Simple, practical design token system.
 * Clean exports, no over-engineering.
 */

// Core design token system
export {
  CSS_VAR_PREFIX,
  cssVar,
  cssVarValue,
  PrimitiveTokens,
  SemanticTokens,
  ComponentArchetypes,
  RagTokens,
  flattenTokens,
  generateCSSVariables,
  $dt,
  injectDesignTokens,
  combineArchetypes
} from './design-tokens';

// Service and provider
export { DesignTokenService } from './design-tokens.service';
export { provideDesignTokens } from './provider';
export type { DesignTokenOverrides, DesignTokenConfig } from './design-tokens.service';

// Types
export type {
  Size,
  ColorName,
  ButtonVariant,
  BadgeVariant,
  InputState,
  CardVariant,
  NavigationVariant,
  TabNavItemState,
  ButtonProps,
  BadgeProps,
  InputProps,
  CardProps,
  NavigationProps,
  TabNavItem,
  TokenPath,
  ThemeMode
} from './types';

// Also export types from design-tokens to avoid conflicts
export type { 
  Size as DesignTokenSize,
  ColorName as DesignTokenColorName,
  ButtonVariant as DesignTokenButtonVariant,
  BadgeVariant as DesignTokenBadgeVariant,
  InputState as DesignTokenInputState,
  CardVariant as DesignTokenCardVariant,
  NavigationVariant as DesignTokenNavigationVariant,
  TabNavItemState as DesignTokenTabNavItemState
} from './design-tokens';