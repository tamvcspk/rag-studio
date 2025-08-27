/**
 * CSS Custom Properties Generator for Design Tokens
 * Converts TypeScript tokens to CSS custom properties for use in SCSS files
 */

import { PrimitiveTokens, SemanticTokens, ComponentTokens } from './design-tokens';

/**
 * Generates CSS custom properties from design tokens
 * This allows the tokens to be used in SCSS files while maintaining type safety
 */
export function generateCSSCustomProperties(): string {
  const cssVars: string[] = [];

  cssVars.push('/* ===== PRIMITIVE TOKENS ===== */');
  cssVars.push('/* Size scale */');
  Object.entries(PrimitiveTokens.size).forEach(([key, value]) => {
    cssVars.push(`--size-${key}: ${value};`);
  });

  cssVars.push('\n/* Color palettes */');
  Object.entries(PrimitiveTokens.color).forEach(([colorName, colorValue]) => {
    if (typeof colorValue === 'object') {
      Object.entries(colorValue).forEach(([scale, hsl]) => {
        cssVars.push(`--color-${colorName}-${scale}: ${hsl};`);
      });
    } else {
      cssVars.push(`--color-${colorName}: ${colorValue};`);
    }
  });

  cssVars.push('\n/* Spacing scale */');
  Object.entries(PrimitiveTokens.spacing).forEach(([key, value]) => {
    cssVars.push(`--spacing-${key}: ${value};`);
  });

  cssVars.push('\n/* Border radius scale */');
  Object.entries(PrimitiveTokens.radius).forEach(([key, value]) => {
    cssVars.push(`--radius-${key}: ${value};`);
  });

  cssVars.push('\n/* Typography scale */');
  Object.entries(PrimitiveTokens.fontSize).forEach(([key, value]) => {
    cssVars.push(`--font-size-${key}: ${value};`);
  });
  
  Object.entries(PrimitiveTokens.lineHeight).forEach(([key, value]) => {
    cssVars.push(`--line-height-${key}: ${value};`);
  });

  cssVars.push('\n/* Shadow scale */');
  Object.entries(PrimitiveTokens.shadow).forEach(([key, value]) => {
    cssVars.push(`--shadow-${key}: ${value};`);
  });

  cssVars.push('\n\n/* ===== SEMANTIC TOKENS ===== */');
  cssVars.push('/* Background colors */');
  Object.entries(SemanticTokens.color.background).forEach(([key, value]) => {
    cssVars.push(`--bg-${key}: ${value};`);
  });

  cssVars.push('\n/* Border colors */');
  Object.entries(SemanticTokens.color.border).forEach(([key, value]) => {
    cssVars.push(`--border-${key}: ${value};`);
  });

  cssVars.push('\n/* Text colors */');
  Object.entries(SemanticTokens.color.text).forEach(([key, value]) => {
    cssVars.push(`--text-${key}: ${value};`);
  });

  cssVars.push('\n\n/* ===== COMPONENT TOKENS ===== */');
  
  // Button tokens
  cssVars.push('/* Button sizes */');
  Object.entries(ComponentTokens.button.size).forEach(([size, props]) => {
    cssVars.push(`--button-${size}-height: ${props.height};`);
    cssVars.push(`--button-${size}-padding: ${props.padding};`);
    cssVars.push(`--button-${size}-font-size: ${props.fontSize};`);
    cssVars.push(`--button-${size}-border-radius: ${props.borderRadius};`);
  });

  // Badge tokens
  cssVars.push('\n/* Badge sizes */');
  Object.entries(ComponentTokens.badge.size).forEach(([size, props]) => {
    cssVars.push(`--badge-${size}-height: ${props.height};`);
    cssVars.push(`--badge-${size}-padding: ${props.padding};`);
    cssVars.push(`--badge-${size}-font-size: ${props.fontSize};`);
    cssVars.push(`--badge-${size}-border-radius: ${props.borderRadius};`);
  });

  // Input tokens
  cssVars.push('\n/* Input sizes */');
  Object.entries(ComponentTokens.input.size).forEach(([size, props]) => {
    cssVars.push(`--input-${size}-height: ${props.height};`);
    cssVars.push(`--input-${size}-padding: ${props.padding};`);
    cssVars.push(`--input-${size}-font-size: ${props.fontSize};`);
    cssVars.push(`--input-${size}-border-radius: ${props.borderRadius};`);
  });

  // Status indicator tokens
  cssVars.push('\n/* Status indicator sizes */');
  Object.entries(ComponentTokens.statusIndicator.size).forEach(([size, props]) => {
    cssVars.push(`--status-${size}-icon-size: ${props.iconSize};`);
    cssVars.push(`--status-${size}-dot-size: ${props.dotSize};`);
  });

  return cssVars.join('\n  ');
}

/**
 * Token-aware utility functions for component development
 */
export const TokenUtils = {
  /**
   * Get color value by semantic path (e.g., 'primary.500', 'success.700')
   */
  getColor(path: string): string {
    const [colorName, scale] = path.split('.');
    const colorMap = PrimitiveTokens.color as any;
    
    if (scale) {
      return colorMap[colorName]?.[scale] || PrimitiveTokens.color.gray[500];
    }
    
    return colorMap[colorName] || PrimitiveTokens.color.gray[500];
  },

  /**
   * Get spacing value by size
   */
  getSpacing(size: keyof typeof PrimitiveTokens.spacing): string {
    return PrimitiveTokens.spacing[size];
  },

  /**
   * Get component token value
   */
  getComponentToken(component: string, property: string, size: string): string {
    const tokens = ComponentTokens as any;
    return tokens[component]?.size?.[size]?.[property] || '';
  },

  /**
   * Generate size variant classes for components
   */
  generateSizeClasses(baseClass: string, sizes: readonly string[]): Record<string, string> {
    return sizes.reduce((acc, size) => {
      acc[size] = `${baseClass}--${size}`;
      return acc;
    }, {} as Record<string, string>);
  }
} as const;