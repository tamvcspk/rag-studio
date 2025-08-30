/**
 * Design Tokens System Entry Point
 * Exports all token-related utilities and types
 */

// Export all from design-tokens except TokenPath to avoid conflict
export {
  CSS_VAR_PREFIX,
  cssVar,
  cssVarValue,
  PrimitiveTokens,
  SemanticTokens,
  ComponentTokens,
  RagStudioPreset,
  flattenTokens,
  generateCSSVariables,
  $dt,
  injectDesignTokens
} from './design-tokens';

// Export types from design-tokens, using TokenPath from design-tokens as the authoritative one
export type { Size, ColorName, ColorScale, Color, TokenPath, TokenValue } from './design-tokens';

// Export all from types except TokenPath to avoid conflict
export type {
  LegacyButtonSize,
  LegacyBadgeSize,
  ColorReference,
  SemanticColor,
  StatusColor,
  ButtonVariant,
  BadgeVariant,
  ButtonType,
  ButtonProps,
  BadgeProps,
  StatusIndicatorProps,
  SpacingToken,
  RadiusToken,
  FontSizeToken,
  ShadowToken,
  CSSCustomProperty,
  ComponentSizeConfig,
  ColorVariantConfig,
  ThemeMode,
  ColorScheme
} from './types';

// Export validation constants and type guards
export {
  VALID_SIZES,
  VALID_COLORS,
  VALID_BUTTON_VARIANTS,
  VALID_BADGE_VARIANTS,
  VALID_STATUS_COLORS,
  isValidSize,
  isValidColorName,
  isValidButtonVariant,
  isValidStatusColor
} from './types';