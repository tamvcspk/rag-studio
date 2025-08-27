/**
 * Design Tokens System for RAG Studio
 * Based on Radix color system with three-tier architecture:
 * 1. Primitive tokens - raw values with no context
 * 2. Semantic tokens - contextual naming that maps to primitives
 * 3. Component tokens - component-specific values that map to semantic
 */

// ===== PRIMITIVE TOKENS =====
// These are raw values with no context - the foundation of the design system

export const PrimitiveTokens = {
  // Size Scale - xs, sm, md, lg, xl system
  size: {
    xs: 'xs',
    sm: 'sm', 
    md: 'md',
    lg: 'lg',
    xl: 'xl'
  } as const,

  // Color Palettes - Full Radix color scales
  color: {
    // Gray scale (primary neutral)
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

    // Blue scale (primary brand)
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

    // Green scale (success)
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

    // Red scale (error/danger)  
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

    // Amber scale (warning)
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

    // Orange scale 
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

    // Purple scale
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

    // Special colors
    white: 'hsl(0, 0%, 100%)',
    black: 'hsl(0, 0%, 0%)',
    transparent: 'transparent'
  },

  // Spacing scale (in px values)
  spacing: {
    xs: '4px',    // xs
    sm: '8px',    // sm  
    md: '12px',   // md
    lg: '16px',   // lg
    xl: '24px'    // xl
  },

  // Border radius scale
  radius: {
    xs: '2px',
    sm: '4px', 
    md: '6px',
    lg: '8px',
    xl: '12px'
  },

  // Typography scale
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

  // Box shadow scale
  shadow: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
  }
} as const;

// ===== SEMANTIC TOKENS =====
// These define context and map to primitive tokens

export const SemanticTokens = {
  // Color intent mapping
  color: {
    // Primary brand colors
    primary: PrimitiveTokens.color.blue,
    
    // Semantic state colors
    success: PrimitiveTokens.color.green,
    warning: PrimitiveTokens.color.amber,
    danger: PrimitiveTokens.color.red,
    error: PrimitiveTokens.color.red,
    info: PrimitiveTokens.color.blue,
    
    // Neutral colors
    neutral: PrimitiveTokens.color.gray,
    
    // Surface colors
    background: {
      default: PrimitiveTokens.color.white,
      subtle: PrimitiveTokens.color.gray[50],
      muted: PrimitiveTokens.color.gray[100]
    },
    
    // Border colors  
    border: {
      default: PrimitiveTokens.color.gray[300],
      subtle: PrimitiveTokens.color.gray[200],
      muted: PrimitiveTokens.color.gray[400]
    },
    
    // Text colors
    text: {
      default: PrimitiveTokens.color.gray[1000],
      subtle: PrimitiveTokens.color.gray[950],
      muted: PrimitiveTokens.color.gray[700],
      disabled: PrimitiveTokens.color.gray[500],
      inverse: PrimitiveTokens.color.white
    }
  },

  // Size semantics
  size: {
    component: {
      xs: PrimitiveTokens.size.xs,
      sm: PrimitiveTokens.size.sm,
      md: PrimitiveTokens.size.md,
      lg: PrimitiveTokens.size.lg,
      xl: PrimitiveTokens.size.xl
    },
    
    spacing: {
      xs: PrimitiveTokens.spacing.xs,
      sm: PrimitiveTokens.spacing.sm,
      md: PrimitiveTokens.spacing.md,
      lg: PrimitiveTokens.spacing.lg,
      xl: PrimitiveTokens.spacing.xl
    }
  },

  // Typography semantics
  typography: {
    fontSize: {
      caption: PrimitiveTokens.fontSize.xs,
      body: PrimitiveTokens.fontSize.md,
      heading: PrimitiveTokens.fontSize.lg
    }
  }
} as const;

// ===== COMPONENT TOKENS =====
// Component-specific tokens that map to semantic tokens

export const ComponentTokens = {
  button: {
    size: {
      xs: {
        height: '24px',
        padding: `0 ${SemanticTokens.size.spacing.xs}`,
        fontSize: PrimitiveTokens.fontSize.xs,
        borderRadius: PrimitiveTokens.radius.xs
      },
      sm: {
        height: '28px',
        padding: `0 ${SemanticTokens.size.spacing.sm}`,
        fontSize: PrimitiveTokens.fontSize.sm,
        borderRadius: PrimitiveTokens.radius.sm
      },
      md: {
        height: '32px',
        padding: `0 ${SemanticTokens.size.spacing.md}`,
        fontSize: PrimitiveTokens.fontSize.md,
        borderRadius: PrimitiveTokens.radius.md
      },
      lg: {
        height: '40px',
        padding: `0 ${SemanticTokens.size.spacing.lg}`,
        fontSize: PrimitiveTokens.fontSize.lg,
        borderRadius: PrimitiveTokens.radius.md
      },
      xl: {
        height: '48px',
        padding: `0 ${SemanticTokens.size.spacing.xl}`,
        fontSize: PrimitiveTokens.fontSize.xl,
        borderRadius: PrimitiveTokens.radius.lg
      }
    },
    
    variant: {
      solid: {
        background: SemanticTokens.color.text.default,
        color: SemanticTokens.color.text.inverse,
        border: 'none'
      },
      outline: {
        background: SemanticTokens.color.background.default,
        color: SemanticTokens.color.text.default,
        border: `1px solid ${SemanticTokens.color.border.default}`
      },
      ghost: {
        background: PrimitiveTokens.color.transparent,
        color: SemanticTokens.color.text.default,
        border: 'none'
      },
      soft: {
        background: SemanticTokens.color.background.muted,
        color: SemanticTokens.color.text.default,
        border: 'none'
      }
    }
  },

  badge: {
    size: {
      xs: {
        height: '16px',
        padding: `0 ${SemanticTokens.size.spacing.xs}`,
        fontSize: PrimitiveTokens.fontSize.xs,
        borderRadius: PrimitiveTokens.radius.xs
      },
      sm: {
        height: '20px',
        padding: `0 ${SemanticTokens.size.spacing.xs}`,
        fontSize: PrimitiveTokens.fontSize.xs,
        borderRadius: PrimitiveTokens.radius.sm
      },
      md: {
        height: '24px',
        padding: `0 ${SemanticTokens.size.spacing.sm}`,
        fontSize: PrimitiveTokens.fontSize.sm,
        borderRadius: PrimitiveTokens.radius.sm
      },
      lg: {
        height: '28px',
        padding: `0 ${SemanticTokens.size.spacing.md}`,
        fontSize: PrimitiveTokens.fontSize.md,
        borderRadius: PrimitiveTokens.radius.md
      },
      xl: {
        height: '32px',
        padding: `0 ${SemanticTokens.size.spacing.lg}`,
        fontSize: PrimitiveTokens.fontSize.md,
        borderRadius: PrimitiveTokens.radius.md
      }
    }
  },

  input: {
    size: {
      xs: {
        height: '24px',
        padding: `0 ${SemanticTokens.size.spacing.xs}`,
        fontSize: PrimitiveTokens.fontSize.xs,
        borderRadius: PrimitiveTokens.radius.xs
      },
      sm: {
        height: '28px',
        padding: `0 ${SemanticTokens.size.spacing.sm}`,
        fontSize: PrimitiveTokens.fontSize.sm,
        borderRadius: PrimitiveTokens.radius.sm
      },
      md: {
        height: '32px',
        padding: `0 ${SemanticTokens.size.spacing.md}`,
        fontSize: PrimitiveTokens.fontSize.md,
        borderRadius: PrimitiveTokens.radius.md
      },
      lg: {
        height: '40px',
        padding: `0 ${SemanticTokens.size.spacing.lg}`,
        fontSize: PrimitiveTokens.fontSize.lg,
        borderRadius: PrimitiveTokens.radius.md
      },
      xl: {
        height: '48px',
        padding: `0 ${SemanticTokens.size.spacing.xl}`,
        fontSize: PrimitiveTokens.fontSize.xl,
        borderRadius: PrimitiveTokens.radius.lg
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
} as const;

// Type definitions for the token system
export type Size = typeof PrimitiveTokens.size[keyof typeof PrimitiveTokens.size];
export type ColorName = 'gray' | 'blue' | 'green' | 'red' | 'amber' | 'orange' | 'purple';
export type ColorScale = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 | 1000;
export type Color = `${ColorName}.${ColorScale}`;