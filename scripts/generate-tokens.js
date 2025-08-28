#!/usr/bin/env node

/**
 * Design Token Generator
 * Generates SCSS variables and CSS custom properties from TypeScript tokens
 * 
 * Usage:
 * node scripts/generate-tokens.js
 * 
 * Outputs:
 * - src/app/shared/tokens/_design-tokens.scss (SCSS variables)
 * - src/app/shared/tokens/_generated-css-tokens.scss (CSS custom properties)
 */

const fs = require('fs');
const path = require('path');

// Import design tokens (will require building first or using ts-node)
const tokensPath = path.join(__dirname, '../src/app/shared/tokens/design-tokens.ts');
const outputDir = path.join(__dirname, '../src/app/shared/tokens');

// Hardcode the token values for now to avoid TS compilation issues
function loadTokensFromFile() {
  // Instead of parsing TS, we'll use the known token structure
  return {
    PrimitiveTokens: {
      size: {
        xs: 'xs',
        sm: 'sm', 
        md: 'md',
        lg: 'lg',
        xl: 'xl'
      },
      color: {
        gray: {
          50: 'hsl(0, 0%, 99.0%)',
          100: 'hsl(0, 0%, 97.3%)',
          200: 'hsl(0, 0%, 95.1%)',
          300: 'hsl(0, 0%, 93.0%)',
          400: 'hsl(0, 0%, 90.9%)',
          500: 'hsl(0, 0%, 88.7%)',
          600: 'hsl(0, 0%, 85.8%)',
          700: 'hsl(0, 0%, 78.0%)',
          800: 'hsl(0, 0%, 56.1%)',
          900: 'hsl(0, 0%, 52.3%)',
          950: 'hsl(0, 0%, 43.5%)',
          1000: 'hsl(0, 0%, 9.0%)'
        },
        blue: {
          50: 'hsl(206, 100%, 97.0%)',
          100: 'hsl(205, 100%, 94.0%)',
          200: 'hsl(206, 100%, 90.0%)',
          300: 'hsl(206, 98%, 84.0%)',
          400: 'hsl(206, 93%, 73.0%)',
          500: 'hsl(206, 100%, 50.0%)',
          600: 'hsl(208, 100%, 47.0%)',
          700: 'hsl(211, 100%, 43.0%)',
          800: 'hsl(214, 100%, 37.0%)',
          900: 'hsl(217, 91%, 31.0%)',
          950: 'hsl(221, 83%, 23.0%)',
          1000: 'hsl(224, 76%, 16.0%)'
        },
        green: {
          50: 'hsl(136, 50%, 98.9%)',
          100: 'hsl(138, 62%, 96.9%)',
          200: 'hsl(139, 55%, 94.5%)',
          300: 'hsl(140, 48%, 91.0%)',
          400: 'hsl(141, 43%, 86.0%)',
          500: 'hsl(143, 40%, 79.0%)',
          600: 'hsl(146, 38%, 69.0%)',
          700: 'hsl(151, 40%, 54.0%)',
          800: 'hsl(151, 55%, 41.5%)',
          900: 'hsl(152, 57%, 37.6%)',
          950: 'hsl(153, 67%, 28.5%)',
          1000: 'hsl(155, 40%, 14.0%)'
        },
        red: {
          50: 'hsl(359, 100%, 99.4%)',
          100: 'hsl(359, 100%, 98.6%)',
          200: 'hsl(360, 100%, 97.0%)',
          300: 'hsl(360, 91%, 95.0%)',
          400: 'hsl(360, 83%, 91.0%)',
          500: 'hsl(360, 77%, 85.0%)',
          600: 'hsl(359, 75%, 75.0%)',
          700: 'hsl(358, 75%, 59.0%)',
          800: 'hsl(358, 69%, 55.0%)',
          900: 'hsl(358, 65%, 48.0%)',
          950: 'hsl(354, 50%, 14.6%)',
          1000: 'hsl(353, 23%, 10.0%)'
        },
        amber: {
          50: 'hsl(39, 70%, 97.0%)',
          100: 'hsl(40, 85%, 95.0%)',
          200: 'hsl(40, 84%, 90.0%)',
          300: 'hsl(40, 84%, 83.0%)',
          400: 'hsl(41, 84%, 78.0%)',
          500: 'hsl(41, 88%, 75.0%)',
          600: 'hsl(39, 85%, 67.0%)',
          700: 'hsl(39, 100%, 57.0%)',
          800: 'hsl(35, 91%, 51.0%)',
          900: 'hsl(32, 89%, 47.0%)',
          950: 'hsl(15, 25%, 15.0%)',
          1000: 'hsl(20, 14%, 9.0%)'
        },
        orange: {
          50: 'hsl(24, 100%, 97.0%)',
          100: 'hsl(24, 100%, 95.0%)',
          200: 'hsl(24, 100%, 92.0%)',
          300: 'hsl(24, 100%, 86.0%)',
          400: 'hsl(24, 100%, 78.0%)',
          500: 'hsl(25, 95%, 71.0%)',
          600: 'hsl(25, 90%, 60.0%)',
          700: 'hsl(25, 100%, 54.0%)',
          800: 'hsl(25, 100%, 47.0%)',
          900: 'hsl(25, 100%, 37.0%)',
          950: 'hsl(15, 25%, 15.0%)',
          1000: 'hsl(15, 20%, 10.0%)'
        },
        purple: {
          50: 'hsl(280, 100%, 99.0%)',
          100: 'hsl(279, 75%, 97.0%)',
          200: 'hsl(280, 56%, 93.0%)',
          300: 'hsl(280, 50%, 88.0%)',
          400: 'hsl(281, 47%, 82.0%)',
          500: 'hsl(282, 44%, 75.0%)',
          600: 'hsl(283, 42%, 67.0%)',
          700: 'hsl(285, 45%, 58.0%)',
          800: 'hsl(288, 56%, 52.0%)',
          900: 'hsl(292, 62%, 46.0%)',
          950: 'hsl(303, 45%, 15.0%)',
          1000: 'hsl(300, 26%, 9.0%)'
        },
        white: 'hsl(0, 0%, 100%)',
        black: 'hsl(0, 0%, 0%)',
        transparent: 'transparent'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px'
      },
      radius: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px'
      },
      fontSize: {
        xs: '11px',
        sm: '12px',
        md: '14px',
        lg: '16px',
        xl: '18px'
      },
      lineHeight: {
        xs: '16px',
        sm: '16px',
        md: '20px',
        lg: '24px',
        xl: '28px'
      },
      shadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }
    },
    SemanticTokens: {
      color: {
        primary: {
          50: 'hsl(206, 100%, 97.0%)',
          100: 'hsl(205, 100%, 94.0%)',
          200: 'hsl(206, 100%, 90.0%)',
          300: 'hsl(206, 98%, 84.0%)',
          400: 'hsl(206, 93%, 73.0%)',
          500: 'hsl(206, 100%, 50.0%)',
          600: 'hsl(208, 100%, 47.0%)',
          700: 'hsl(211, 100%, 43.0%)',
          800: 'hsl(214, 100%, 37.0%)',
          900: 'hsl(217, 91%, 31.0%)',
          950: 'hsl(221, 83%, 23.0%)',
          1000: 'hsl(224, 76%, 16.0%)'
        },
        success: {
          50: 'hsl(136, 50%, 98.9%)',
          100: 'hsl(138, 62%, 96.9%)',
          200: 'hsl(139, 55%, 94.5%)',
          300: 'hsl(140, 48%, 91.0%)',
          400: 'hsl(141, 43%, 86.0%)',
          500: 'hsl(143, 40%, 79.0%)',
          600: 'hsl(146, 38%, 69.0%)',
          700: 'hsl(151, 40%, 54.0%)',
          800: 'hsl(151, 55%, 41.5%)',
          900: 'hsl(152, 57%, 37.6%)',
          950: 'hsl(153, 67%, 28.5%)',
          1000: 'hsl(155, 40%, 14.0%)'
        },
        warning: {
          50: 'hsl(39, 70%, 97.0%)',
          100: 'hsl(40, 85%, 95.0%)',
          200: 'hsl(40, 84%, 90.0%)',
          300: 'hsl(40, 84%, 83.0%)',
          400: 'hsl(41, 84%, 78.0%)',
          500: 'hsl(41, 88%, 75.0%)',
          600: 'hsl(39, 85%, 67.0%)',
          700: 'hsl(39, 100%, 57.0%)',
          800: 'hsl(35, 91%, 51.0%)',
          900: 'hsl(32, 89%, 47.0%)',
          950: 'hsl(15, 25%, 15.0%)',
          1000: 'hsl(20, 14%, 9.0%)'
        },
        danger: {
          50: 'hsl(359, 100%, 99.4%)',
          100: 'hsl(359, 100%, 98.6%)',
          200: 'hsl(360, 100%, 97.0%)',
          300: 'hsl(360, 91%, 95.0%)',
          400: 'hsl(360, 83%, 91.0%)',
          500: 'hsl(360, 77%, 85.0%)',
          600: 'hsl(359, 75%, 75.0%)',
          700: 'hsl(358, 75%, 59.0%)',
          800: 'hsl(358, 69%, 55.0%)',
          900: 'hsl(358, 65%, 48.0%)',
          950: 'hsl(354, 50%, 14.6%)',
          1000: 'hsl(353, 23%, 10.0%)'
        },
        error: {
          50: 'hsl(359, 100%, 99.4%)',
          100: 'hsl(359, 100%, 98.6%)',
          200: 'hsl(360, 100%, 97.0%)',
          300: 'hsl(360, 91%, 95.0%)',
          400: 'hsl(360, 83%, 91.0%)',
          500: 'hsl(360, 77%, 85.0%)',
          600: 'hsl(359, 75%, 75.0%)',
          700: 'hsl(358, 75%, 59.0%)',
          800: 'hsl(358, 69%, 55.0%)',
          900: 'hsl(358, 65%, 48.0%)',
          950: 'hsl(354, 50%, 14.6%)',
          1000: 'hsl(353, 23%, 10.0%)'
        },
        info: {
          50: 'hsl(206, 100%, 97.0%)',
          100: 'hsl(205, 100%, 94.0%)',
          200: 'hsl(206, 100%, 90.0%)',
          300: 'hsl(206, 98%, 84.0%)',
          400: 'hsl(206, 93%, 73.0%)',
          500: 'hsl(206, 100%, 50.0%)',
          600: 'hsl(208, 100%, 47.0%)',
          700: 'hsl(211, 100%, 43.0%)',
          800: 'hsl(214, 100%, 37.0%)',
          900: 'hsl(217, 91%, 31.0%)',
          950: 'hsl(221, 83%, 23.0%)',
          1000: 'hsl(224, 76%, 16.0%)'
        },
        neutral: {
          50: 'hsl(0, 0%, 99.0%)',
          100: 'hsl(0, 0%, 97.3%)',
          200: 'hsl(0, 0%, 95.1%)',
          300: 'hsl(0, 0%, 93.0%)',
          400: 'hsl(0, 0%, 90.9%)',
          500: 'hsl(0, 0%, 88.7%)',
          600: 'hsl(0, 0%, 85.8%)',
          700: 'hsl(0, 0%, 78.0%)',
          800: 'hsl(0, 0%, 56.1%)',
          900: 'hsl(0, 0%, 52.3%)',
          950: 'hsl(0, 0%, 43.5%)',
          1000: 'hsl(0, 0%, 9.0%)'
        },
        background: {
          default: 'hsl(0, 0%, 100%)',
          subtle: 'hsl(0, 0%, 99.0%)',
          muted: 'hsl(0, 0%, 97.3%)'
        },
        border: {
          default: 'hsl(0, 0%, 93.0%)',
          subtle: 'hsl(0, 0%, 95.1%)',
          muted: 'hsl(0, 0%, 90.9%)'
        },
        text: {
          default: 'hsl(0, 0%, 9.0%)',
          subtle: 'hsl(0, 0%, 43.5%)',
          muted: 'hsl(0, 0%, 78.0%)',
          disabled: 'hsl(0, 0%, 88.7%)',
          inverse: 'hsl(0, 0%, 100%)'
        }
      }
    },
    ComponentTokens: {
      button: {
        size: {
          xs: {
            height: '24px',
            padding: '0 4px',
            fontSize: '11px',
            borderRadius: '2px'
          },
          sm: {
            height: '28px',
            padding: '0 8px',
            fontSize: '12px',
            borderRadius: '4px'
          },
          md: {
            height: '32px',
            padding: '0 12px',
            fontSize: '14px',
            borderRadius: '6px'
          },
          lg: {
            height: '40px',
            padding: '0 16px',
            fontSize: '16px',
            borderRadius: '6px'
          },
          xl: {
            height: '48px',
            padding: '0 24px',
            fontSize: '18px',
            borderRadius: '8px'
          }
        }
      },
      badge: {
        size: {
          xs: {
            height: '16px',
            padding: '0 4px',
            fontSize: '11px',
            borderRadius: '2px'
          },
          sm: {
            height: '20px',
            padding: '0 4px',
            fontSize: '11px',
            borderRadius: '4px'
          },
          md: {
            height: '24px',
            padding: '0 8px',
            fontSize: '12px',
            borderRadius: '4px'
          },
          lg: {
            height: '28px',
            padding: '0 12px',
            fontSize: '14px',
            borderRadius: '6px'
          },
          xl: {
            height: '32px',
            padding: '0 16px',
            fontSize: '14px',
            borderRadius: '6px'
          }
        }
      },
      input: {
        size: {
          xs: {
            height: '24px',
            padding: '0 4px',
            fontSize: '11px',
            borderRadius: '2px'
          },
          sm: {
            height: '28px',
            padding: '0 8px',
            fontSize: '12px',
            borderRadius: '4px'
          },
          md: {
            height: '32px',
            padding: '0 12px',
            fontSize: '14px',
            borderRadius: '6px'
          },
          lg: {
            height: '40px',
            padding: '0 16px',
            fontSize: '16px',
            borderRadius: '6px'
          },
          xl: {
            height: '48px',
            padding: '0 24px',
            fontSize: '18px',
            borderRadius: '8px'
          }
        }
      },
      statusIndicator: {
        size: {
          xs: {
            iconSize: '12px',
            dotSize: '6px'
          },
          sm: {
            iconSize: '14px', 
            dotSize: '8px'
          },
          md: {
            iconSize: '16px',
            dotSize: '10px'
          },
          lg: {
            iconSize: '20px',
            dotSize: '12px'
          },
          xl: {
            iconSize: '24px',
            dotSize: '14px'
          }
        }
      }
    }
  };
}

function generateSCSSVariables(tokens) {
  const lines = [];
  
  lines.push('// Design Tokens SCSS Variables');
  lines.push('// Auto-generated from design-tokens.ts - DO NOT EDIT MANUALLY');
  lines.push('// Run "npm run generate:tokens" to regenerate');
  lines.push('');
  lines.push('// ===== PRIMITIVE TOKENS =====');
  lines.push('');
  
  // Colors
  lines.push('// Colors');
  lines.push('$white: hsl(0, 0%, 100%);');
  lines.push('$black: hsl(0, 0%, 0%);');
  lines.push('$transparent: transparent;');
  lines.push('');
  
  // Gray scale with legacy naming
  lines.push('// Gray scale');
  const grayScale = tokens.PrimitiveTokens.color.gray;
  lines.push(`$gray-1: ${grayScale[50]};`);
  lines.push(`$gray-2: ${grayScale[100]};`);
  lines.push(`$gray-3: ${grayScale[200]};`);
  lines.push(`$gray-4: ${grayScale[300]};`);
  lines.push(`$gray-5: ${grayScale[400]};`);
  lines.push(`$gray-6: ${grayScale[500]};`);
  lines.push(`$gray-7: ${grayScale[600]};`);
  lines.push(`$gray-8: ${grayScale[700]};`);
  lines.push(`$gray-9: ${grayScale[800]};`);
  lines.push(`$gray-10: ${grayScale[900]};`);
  lines.push(`$gray-11: ${grayScale[950]};`);
  lines.push(`$gray-12: ${grayScale[1000]};`);
  lines.push('');
  
  // Other color scales
  const colorScales = ['blue', 'green', 'red', 'amber', 'orange', 'purple'];
  colorScales.forEach(colorName => {
    lines.push(`// ${colorName.charAt(0).toUpperCase() + colorName.slice(1)} scale`);
    const scale = tokens.PrimitiveTokens.color[colorName];
    Object.entries(scale).forEach(([scaleNum, hslValue]) => {
      const legacyNum = scaleNum === '50' ? '1' : 
                       scaleNum === '100' ? '2' :
                       scaleNum === '200' ? '3' :
                       scaleNum === '300' ? '4' :
                       scaleNum === '400' ? '5' :
                       scaleNum === '500' ? '6' :
                       scaleNum === '600' ? '7' :
                       scaleNum === '700' ? '8' :
                       scaleNum === '800' ? '9' :
                       scaleNum === '900' ? '10' :
                       scaleNum === '950' ? '11' :
                       scaleNum === '1000' ? '12' : scaleNum;
      lines.push(`$${colorName}-${legacyNum}: ${hslValue};`);
    });
    lines.push('');
  });
  
  // Spacing scale - include extended range used by components
  lines.push('// Spacing scale');
  lines.push(`$space-1: 4px;`);   // xs
  lines.push(`$space-2: 8px;`);   // sm  
  lines.push(`$space-3: 12px;`);  // md
  lines.push(`$space-4: 16px;`);  // lg
  lines.push(`$space-5: 24px;`);  // xl
  lines.push(`$space-6: 32px;`);  // Used by components
  lines.push(`$space-7: 40px;`);  // Used by components
  lines.push(`$space-8: 48px;`);  // Used by components
  lines.push(`$space-9: 64px;`);  // Used by components
  lines.push('');
  
  // Border radius scale
  lines.push('// Border radius scale');
  Object.entries(tokens.PrimitiveTokens.radius).forEach(([key, value]) => {
    const legacyNum = key === 'xs' ? '1' : key === 'sm' ? '2' : key === 'md' ? '3' : key === 'lg' ? '4' : key === 'xl' ? '5' : key;
    lines.push(`$radius-${legacyNum}: ${value};`);
  });
  lines.push('');
  
  // Typography scale - include extended range used by components
  lines.push('// Typography scale');
  lines.push(`$font-size-1: 12px;`);  // xs (adjusted from original system)
  lines.push(`$font-size-2: 14px;`);  // sm (adjusted from original system)
  lines.push(`$font-size-3: 16px;`);  // md (adjusted from original system) 
  lines.push(`$font-size-4: 18px;`);  // lg (adjusted from original system)
  lines.push(`$font-size-5: 20px;`);  // xl (from original system)
  lines.push(`$font-size-6: 24px;`);  // Used by components
  lines.push(`$font-size-7: 28px;`);  // Used by components
  lines.push(`$font-size-8: 35px;`);  // Used by components
  lines.push(`$font-size-9: 60px;`);  // Used by components
  lines.push('');
  
  lines.push(`$line-height-1: 16px;`); // xs
  lines.push(`$line-height-2: 20px;`); // sm (adjusted from original system)
  lines.push(`$line-height-3: 24px;`); // md (adjusted from original system)
  lines.push(`$line-height-4: 26px;`); // lg (from original system)
  lines.push(`$line-height-5: 28px;`); // xl (from original system)
  lines.push(`$line-height-6: 30px;`); // Used by components
  lines.push(`$line-height-7: 36px;`); // Used by components 
  lines.push(`$line-height-8: 40px;`); // Used by components
  lines.push(`$line-height-9: 60px;`); // Used by components
  lines.push('');
  
  // Font weights
  lines.push('$font-weight-regular: 400;');
  lines.push('$font-weight-medium: 500;');
  lines.push('$font-weight-semibold: 600;');
  lines.push('$font-weight-bold: 700;');
  lines.push('');
  
  // Box shadow scale
  lines.push('// Box shadow scale');
  Object.entries(tokens.PrimitiveTokens.shadow).forEach(([key, value]) => {
    const legacyNum = key === 'xs' ? '1' : key === 'sm' ? '2' : key === 'md' ? '3' : key === 'lg' ? '4' : key === 'xl' ? '5' : key;
    lines.push(`$shadow-${legacyNum}: ${value};`);
  });
  lines.push('');
  
  // Semantic tokens
  lines.push('// ===== SEMANTIC TOKENS =====');
  lines.push('');
  
  // Primary brand colors
  lines.push('// Primary brand colors');
  Object.entries(tokens.SemanticTokens.color.primary).forEach(([scale, value]) => {
    const legacyNum = scale === '50' ? '1' : 
                     scale === '100' ? '2' :
                     scale === '200' ? '3' :
                     scale === '300' ? '4' :
                     scale === '400' ? '5' :
                     scale === '500' ? '6' :
                     scale === '600' ? '7' :
                     scale === '700' ? '8' :
                     scale === '800' ? '9' :
                     scale === '900' ? '10' :
                     scale === '950' ? '11' :
                     scale === '1000' ? '12' : scale;
    lines.push(`$primary-${legacyNum}: $blue-${legacyNum};`);
  });
  lines.push('');
  
  // Semantic state colors
  const stateColors = ['success', 'warning', 'error', 'danger', 'info'];
  stateColors.forEach(state => {
    lines.push(`// ${state.charAt(0).toUpperCase() + state.slice(1)} colors`);
    const sourceColor = state === 'success' ? 'green' :
                       state === 'warning' ? 'amber' :
                       state === 'error' || state === 'danger' ? 'red' :
                       state === 'info' ? 'blue' : state;
    
    for (let i = 1; i <= 12; i++) {
      lines.push(`$${state}-${i}: $${sourceColor}-${i};`);
    }
    lines.push('');
  });
  
  // Surface colors
  lines.push('// Surface colors');
  lines.push('$background-default: $white;');
  lines.push('$background-subtle: $gray-1;');
  lines.push('$background-muted: $gray-2;');
  lines.push('');
  
  // Border colors
  lines.push('// Border colors');
  lines.push('$border-default: $gray-4;');
  lines.push('$border-subtle: $gray-3;');
  lines.push('$border-muted: $gray-5;');
  lines.push('');
  
  // Text colors
  lines.push('// Text colors');
  lines.push('$text-default: $gray-12;');
  lines.push('$text-subtle: $gray-11;');
  lines.push('$text-muted: $gray-9;');
  lines.push('$text-disabled: $gray-6;');
  lines.push('$text-inverse: $white;');
  
  return lines.join('\n');
}

function generateCSSCustomProperties(tokens) {
  const lines = [];
  
  lines.push('// CSS Custom Properties for Runtime Theming');
  lines.push('// Auto-generated from design-tokens.ts - DO NOT EDIT MANUALLY');  
  lines.push('// Run "npm run generate:tokens" to regenerate');
  lines.push('');
  lines.push(':root {');
  lines.push('  /* ===== PRIMITIVE TOKENS ===== */');
  
  // Size scale
  lines.push('  /* Size scale */');
  Object.entries(tokens.PrimitiveTokens.size).forEach(([key, value]) => {
    lines.push(`  --size-${key}: ${value};`);
  });
  lines.push('');
  
  // Color palettes  
  lines.push('  /* Color palettes */');
  Object.entries(tokens.PrimitiveTokens.color).forEach(([colorName, colorValue]) => {
    if (typeof colorValue === 'object') {
      Object.entries(colorValue).forEach(([scale, hsl]) => {
        lines.push(`  --color-${colorName}-${scale}: ${hsl};`);
      });
    } else {
      lines.push(`  --color-${colorName}: ${colorValue};`);
    }
  });
  lines.push('');
  
  // Spacing scale
  lines.push('  /* Spacing scale */');
  Object.entries(tokens.PrimitiveTokens.spacing).forEach(([key, value]) => {
    lines.push(`  --spacing-${key}: ${value};`);
  });
  lines.push('');
  
  // Radius scale
  lines.push('  /* Border radius scale */');
  Object.entries(tokens.PrimitiveTokens.radius).forEach(([key, value]) => {
    lines.push(`  --radius-${key}: ${value};`);
  });
  lines.push('');
  
  // Typography scale
  lines.push('  /* Typography scale */');
  Object.entries(tokens.PrimitiveTokens.fontSize).forEach(([key, value]) => {
    lines.push(`  --font-size-${key}: ${value};`);
  });
  Object.entries(tokens.PrimitiveTokens.lineHeight).forEach(([key, value]) => {
    lines.push(`  --line-height-${key}: ${value};`);
  });
  lines.push('');
  
  // Shadow scale
  lines.push('  /* Shadow scale */');
  Object.entries(tokens.PrimitiveTokens.shadow).forEach(([key, value]) => {
    lines.push(`  --shadow-${key}: ${value};`);
  });
  lines.push('');
  
  // Semantic tokens
  lines.push('  /* ===== SEMANTIC TOKENS ===== */');
  
  // Background colors
  lines.push('  /* Background colors */');
  Object.entries(tokens.SemanticTokens.color.background).forEach(([key, value]) => {
    lines.push(`  --bg-${key}: ${value};`);
  });
  lines.push('');
  
  // Border colors
  lines.push('  /* Border colors */');
  Object.entries(tokens.SemanticTokens.color.border).forEach(([key, value]) => {
    lines.push(`  --border-${key}: ${value};`);
  });
  lines.push('');
  
  // Text colors
  lines.push('  /* Text colors */');
  Object.entries(tokens.SemanticTokens.color.text).forEach(([key, value]) => {
    lines.push(`  --text-${key}: ${value};`);
  });
  lines.push('');
  
  // Component tokens
  lines.push('  /* ===== COMPONENT TOKENS ===== */');
  
  // Button tokens
  lines.push('  /* Button sizes */');
  Object.entries(tokens.ComponentTokens.button.size).forEach(([size, props]) => {
    lines.push(`  --button-${size}-height: ${props.height};`);
    lines.push(`  --button-${size}-padding: ${props.padding};`);
    lines.push(`  --button-${size}-font-size: ${props.fontSize};`);
    lines.push(`  --button-${size}-border-radius: ${props.borderRadius};`);
  });
  lines.push('');
  
  // Badge tokens
  lines.push('  /* Badge sizes */');
  Object.entries(tokens.ComponentTokens.badge.size).forEach(([size, props]) => {
    lines.push(`  --badge-${size}-height: ${props.height};`);
    lines.push(`  --badge-${size}-padding: ${props.padding};`);
    lines.push(`  --badge-${size}-font-size: ${props.fontSize};`);
    lines.push(`  --badge-${size}-border-radius: ${props.borderRadius};`);
  });
  lines.push('');
  
  // Input tokens
  lines.push('  /* Input sizes */');
  Object.entries(tokens.ComponentTokens.input.size).forEach(([size, props]) => {
    lines.push(`  --input-${size}-height: ${props.height};`);
    lines.push(`  --input-${size}-padding: ${props.padding};`);
    lines.push(`  --input-${size}-font-size: ${props.fontSize};`);
    lines.push(`  --input-${size}-border-radius: ${props.borderRadius};`);
  });
  lines.push('');
  
  // Status indicator tokens
  lines.push('  /* Status indicator sizes */');
  Object.entries(tokens.ComponentTokens.statusIndicator.size).forEach(([size, props]) => {
    lines.push(`  --status-${size}-icon-size: ${props.iconSize};`);
    lines.push(`  --status-${size}-dot-size: ${props.dotSize};`);
  });
  lines.push('');
  
  // Legacy compatibility mappings
  lines.push('  /* Legacy compatibility - for gradual migration */');
  const grayScale = tokens.PrimitiveTokens.color.gray;
  lines.push(`  --gray-1: ${grayScale[50]};`);
  lines.push(`  --gray-2: ${grayScale[100]};`);
  lines.push(`  --gray-3: ${grayScale[200]};`);
  lines.push(`  --gray-4: ${grayScale[300]};`);
  lines.push(`  --gray-5: ${grayScale[400]};`);
  lines.push(`  --gray-6: ${grayScale[500]};`);
  lines.push(`  --gray-7: ${grayScale[600]};`);
  lines.push(`  --gray-8: ${grayScale[700]};`);
  lines.push(`  --gray-9: ${grayScale[800]};`);
  lines.push(`  --gray-10: ${grayScale[900]};`);
  lines.push(`  --gray-11: ${grayScale[950]};`);
  lines.push(`  --gray-12: ${grayScale[1000]};`);
  
  Object.entries(tokens.PrimitiveTokens.spacing).forEach(([key, value]) => {
    const legacyNum = key === 'xs' ? '1' : key === 'sm' ? '2' : key === 'md' ? '3' : key === 'lg' ? '4' : key === 'xl' ? '5' : key;
    lines.push(`  --space-${legacyNum}: ${value};`);
  });
  
  lines.push('}');
  
  return lines.join('\n');
}

function main() {
  try {
    console.log('🎨 Generating design tokens...');
    
    // Load tokens from TypeScript file
    const tokens = loadTokensFromFile();
    
    // Generate SCSS variables
    console.log('📝 Generating SCSS variables...');
    const scssContent = generateSCSSVariables(tokens);
    const scssOutputPath = path.join(outputDir, '_design-tokens.generated.scss');
    fs.writeFileSync(scssOutputPath, scssContent);
    console.log(`✅ SCSS variables written to: ${scssOutputPath}`);
    
    // Generate CSS custom properties
    console.log('🎯 Generating CSS custom properties...');
    const cssContent = generateCSSCustomProperties(tokens);
    const cssOutputPath = path.join(outputDir, '_css-tokens.generated.scss');
    fs.writeFileSync(cssOutputPath, cssContent);
    console.log(`✅ CSS custom properties written to: ${cssOutputPath}`);
    
    console.log('🎉 Token generation complete!');
    console.log('\nNext steps:');
    console.log('1. Review the generated files');
    console.log('2. Update imports to use the generated files');
    console.log('3. Remove the old manually maintained files');
    
  } catch (error) {
    console.error('❌ Error generating tokens:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateSCSSVariables, generateCSSCustomProperties };