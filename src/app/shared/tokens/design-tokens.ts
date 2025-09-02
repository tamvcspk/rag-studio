/**
 * RAG Studio Design Tokens
 * 
 * Simple, practical design token system with:
 * - Primitive tokens (colors, spacing, typography, etc.)
 * - Semantic tokens (contextual meanings)
 * - Component archetypes (reusable patterns)
 */

export const CSS_VAR_PREFIX = 'rag';

// Utility functions
export const cssVar = (path: string) => `--${CSS_VAR_PREFIX}-${path.replace(/\./g, '-')}`;
export const cssVarValue = (path: string) => `var(${cssVar(path)})`;

// ===== PRIMITIVE TOKENS =====
export const PrimitiveTokens = {
  // Colors - Radix-inspired 12-step scales
  color: {
    // Gray scale
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
    white: 'hsl(0, 0%, 100%)',
    black: 'hsl(0, 0%, 0%)',
    transparent: 'transparent'
  },

  // Spacing scale
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px'
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
    tight: '1.25',
    xs: '16px',
    sm: '16px',
    md: '20px',
    lg: '24px',
    xl: '28px'
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700'
  },

  // Border radius scale
  radius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    xxl: '24px'
  },

  // Box shadow scale
  shadow: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
  },

  // Border width scale
  borderWidth: {
    1: '1px',
    2: '2px',
    4: '4px',
    8: '8px'
  },

  // Z-index scale
  zIndex: {
    auto: 'auto',
    base: '0',
    raised: '10',
    sticky: '11'
  },

  // Size scale (height/width values)
  size: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    7: '28px',
    8: '32px',
    9: '36px',
    10: '40px',
    11: '44px',
    12: '48px',
    14: '56px',
    16: '64px',
    20: '80px',
    24: '96px',
    28: '112px',
    32: '128px',
    36: '144px',
    40: '160px',
    44: '176px',
    48: '192px',
    52: '208px',
    56: '224px',
    60: '240px',
    64: '256px',
    72: '288px',
    80: '320px',
    96: '384px'
  },

  // Breakpoint scale
  breakpoint: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  }
} as const;

// ===== SEMANTIC TOKENS =====
export const SemanticTokens = {
  color: {
    // Brand & status colors
    primary: PrimitiveTokens.color.blue,
    success: PrimitiveTokens.color.green,
    warning: PrimitiveTokens.color.amber,
    danger: PrimitiveTokens.color.red,
    neutral: PrimitiveTokens.color.gray,
    
    // UI colors
    background: {
      default: PrimitiveTokens.color.white,
      subtle: PrimitiveTokens.color.gray[50],
      muted: PrimitiveTokens.color.gray[400]
    },
    
    border: {
      default: PrimitiveTokens.color.gray[500],
      subtle: PrimitiveTokens.color.gray[400],
      muted: PrimitiveTokens.color.gray[600]
    },
    
    text: {
      default: PrimitiveTokens.color.gray[1000],
      subtle: PrimitiveTokens.color.gray[950],
      muted: PrimitiveTokens.color.gray[700],
      disabled: PrimitiveTokens.color.gray[500],
      inverse: PrimitiveTokens.color.white
    }
  }
} as const;

// ===== COMPONENT ARCHETYPES =====
// Reusable patterns for common component needs

export const ComponentArchetypes = {
  // Button archetypes - different visual styles
  button: {
    solid: {
      background: cssVarValue('semantic.color.text.default'),
      color: cssVarValue('semantic.color.text.inverse'),
      border: 'none'
    },
    outline: {
      background: cssVarValue('semantic.color.background.default'),
      color: cssVarValue('semantic.color.text.default'),
      border: `1px solid ${cssVarValue('semantic.color.border.default')}`
    },
    ghost: {
      background: 'transparent',
      color: cssVarValue('semantic.color.text.default'),
      border: 'none'
    },
    soft: {
      background: cssVarValue('semantic.color.background.muted'),
      color: cssVarValue('semantic.color.text.default'),
      border: 'none'
    }
  },

  // Input archetypes - different states
  input: {
    default: {
      background: cssVarValue('semantic.color.background.default'),
      border: `1px solid ${cssVarValue('semantic.color.border.default')}`,
      color: cssVarValue('semantic.color.text.default')
    },
    focus: {
      background: cssVarValue('semantic.color.background.default'),
      border: `1px solid ${cssVarValue('semantic.color.primary.500')}`,
      boxShadow: `0 0 0 3px ${cssVarValue('semantic.color.primary.100')}`,
      color: cssVarValue('semantic.color.text.default')
    },
    error: {
      background: cssVarValue('semantic.color.background.default'),
      border: `1px solid ${cssVarValue('semantic.color.danger.500')}`,
      boxShadow: `0 0 0 3px ${cssVarValue('semantic.color.danger.100')}`,
      color: cssVarValue('semantic.color.text.default')
    },
    disabled: {
      background: cssVarValue('semantic.color.background.muted'),
      border: `1px solid ${cssVarValue('semantic.color.border.subtle')}`,
      color: cssVarValue('semantic.color.text.disabled'),
      cursor: 'not-allowed'
    }
  },

  // Card archetypes - different elevations
  card: {
    flat: {
      background: cssVarValue('semantic.color.background.default'),
      border: `1px solid ${cssVarValue('semantic.color.border.default')}`,
      boxShadow: 'none'
    },
    elevated: {
      background: cssVarValue('semantic.color.background.default'),
      border: 'none',
      boxShadow: cssVarValue('primitive.shadow.md')
    },
    floating: {
      background: cssVarValue('semantic.color.background.default'),
      border: 'none',
      boxShadow: cssVarValue('primitive.shadow.lg')
    }
  },

  // Badge archetypes - different intents
  chip: {
    primary: { background: cssVarValue('semantic.color.primary.100'), color: cssVarValue('semantic.color.primary.900') },
    success: { background: cssVarValue('semantic.color.success.100'), color: cssVarValue('semantic.color.success.900') },
    warning: { background: cssVarValue('semantic.color.warning.100'), color: cssVarValue('semantic.color.warning.900') },
    danger: { background: cssVarValue('semantic.color.danger.100'), color: cssVarValue('semantic.color.danger.900') },
    neutral: { background: cssVarValue('semantic.color.neutral.100'), color: cssVarValue('semantic.color.neutral.900') }
  },

  // Size archetype - consistent sizing across components
  size: {
    xs: { height: '24px', padding: `0 ${cssVarValue('primitive.spacing.xs')}`, fontSize: cssVarValue('primitive.fontSize.xs'), borderRadius: cssVarValue('primitive.radius.xs') },
    sm: { height: '28px', padding: `0 ${cssVarValue('primitive.spacing.sm')}`, fontSize: cssVarValue('primitive.fontSize.sm'), borderRadius: cssVarValue('primitive.radius.sm') },
    md: { height: '32px', padding: `0 ${cssVarValue('primitive.spacing.md')}`, fontSize: cssVarValue('primitive.fontSize.md'), borderRadius: cssVarValue('primitive.radius.md') },
    lg: { height: '40px', padding: `0 ${cssVarValue('primitive.spacing.lg')}`, fontSize: cssVarValue('primitive.fontSize.lg'), borderRadius: cssVarValue('primitive.radius.md') },
    xl: { height: '48px', padding: `0 ${cssVarValue('primitive.spacing.xl')}`, fontSize: cssVarValue('primitive.fontSize.xl'), borderRadius: cssVarValue('primitive.radius.lg') }
  },

  // Alert/Feedback archetypes - different message types
  alert: {
    info: {
      background: cssVarValue('semantic.color.primary.100'),
      color: cssVarValue('semantic.color.primary.950'),
      border: `1px solid ${cssVarValue('semantic.color.primary.300')}`,
      iconColor: cssVarValue('semantic.color.primary.700')
    },
    success: {
      background: cssVarValue('semantic.color.success.100'),
      color: cssVarValue('semantic.color.success.950'),
      border: `1px solid ${cssVarValue('semantic.color.success.300')}`,
      iconColor: cssVarValue('semantic.color.success.700')
    },
    warning: {
      background: cssVarValue('semantic.color.warning.100'),
      color: cssVarValue('semantic.color.warning.950'),
      border: `1px solid ${cssVarValue('semantic.color.warning.300')}`,
      iconColor: cssVarValue('semantic.color.warning.700')
    },
    error: {
      background: cssVarValue('semantic.color.danger.100'),
      color: cssVarValue('semantic.color.danger.950'),
      border: `1px solid ${cssVarValue('semantic.color.danger.300')}`,
      iconColor: cssVarValue('semantic.color.danger.700')
    }
  },

  // Select/Dropdown archetypes - different states
  select: {
    default: {
      background: cssVarValue('semantic.color.background.default'),
      border: `1px solid ${cssVarValue('semantic.color.border.default')}`,
      color: cssVarValue('semantic.color.text.default')
    },
    focus: {
      background: cssVarValue('semantic.color.background.default'),
      border: `1px solid ${cssVarValue('semantic.color.primary.500')}`,
      boxShadow: `0 0 0 3px ${cssVarValue('semantic.color.primary.100')}`,
      color: cssVarValue('semantic.color.text.default')
    },
    error: {
      background: cssVarValue('semantic.color.background.default'),
      border: `1px solid ${cssVarValue('semantic.color.danger.500')}`,
      boxShadow: `0 0 0 3px ${cssVarValue('semantic.color.danger.100')}`,
      color: cssVarValue('semantic.color.text.default')
    },
    disabled: {
      background: cssVarValue('semantic.color.background.muted'),
      border: `1px solid ${cssVarValue('semantic.color.border.subtle')}`,
      color: cssVarValue('semantic.color.text.disabled'),
      cursor: 'not-allowed'
    }
  },

  // Progress archetypes - different states and colors
  progress: {
    primary: {
      background: cssVarValue('semantic.color.primary.200'),
      fill: cssVarValue('semantic.color.primary.600'),
      text: cssVarValue('semantic.color.primary.900')
    },
    success: {
      background: cssVarValue('semantic.color.success.200'),
      fill: cssVarValue('semantic.color.success.600'),
      text: cssVarValue('semantic.color.success.900')
    },
    warning: {
      background: cssVarValue('semantic.color.warning.200'),
      fill: cssVarValue('semantic.color.warning.600'),
      text: cssVarValue('semantic.color.warning.900')
    },
    danger: {
      background: cssVarValue('semantic.color.danger.200'),
      fill: cssVarValue('semantic.color.danger.600'),
      text: cssVarValue('semantic.color.danger.900')
    }
  },

  // Switch/Toggle archetypes - different states
  switch: {
    default: {
      track: {
        background: cssVarValue('semantic.color.neutral.300'),
        borderColor: cssVarValue('semantic.color.neutral.400')
      },
      thumb: {
        background: cssVarValue('semantic.color.background.default'),
        borderColor: cssVarValue('semantic.color.neutral.300')
      }
    },
    checked: {
      track: {
        background: cssVarValue('semantic.color.primary.500'),
        borderColor: cssVarValue('semantic.color.primary.600')
      },
      thumb: {
        background: cssVarValue('semantic.color.background.default'),
        borderColor: cssVarValue('semantic.color.primary.600')
      }
    },
    disabled: {
      track: {
        background: cssVarValue('semantic.color.neutral.200'),
        borderColor: cssVarValue('semantic.color.neutral.300')
      },
      thumb: {
        background: cssVarValue('semantic.color.neutral.100'),
        borderColor: cssVarValue('semantic.color.neutral.200')
      }
    }
  },

  // Icon archetypes - consistent sizing and colors
  icon: {
    size: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px'
    },
    color: {
      default: cssVarValue('semantic.color.text.default'),
      subtle: cssVarValue('semantic.color.text.subtle'),
      muted: cssVarValue('semantic.color.text.muted'),
      primary: cssVarValue('semantic.color.primary.600'),
      success: cssVarValue('semantic.color.success.600'),
      warning: cssVarValue('semantic.color.warning.600'),
      danger: cssVarValue('semantic.color.danger.600')
    }
  },

  // Skeleton archetypes - loading placeholders
  skeleton: {
    text: {
      background: cssVarValue('semantic.color.neutral.200'),
      borderRadius: cssVarValue('primitive.radius.xs')
    },
    circular: {
      background: cssVarValue('semantic.color.neutral.200'),
      borderRadius: '50%'
    },
    rectangular: {
      background: cssVarValue('semantic.color.neutral.200'),
      borderRadius: cssVarValue('primitive.radius.sm')
    }
  },

  // Tooltip archetypes - positioning and styling
  tooltip: {
    default: {
      background: cssVarValue('semantic.color.text.default'),
      color: cssVarValue('semantic.color.text.inverse'),
      borderRadius: cssVarValue('primitive.radius.sm'),
      boxShadow: cssVarValue('primitive.shadow.lg'),
      fontSize: cssVarValue('primitive.fontSize.sm'),
      padding: `${cssVarValue('primitive.spacing.xs')} ${cssVarValue('primitive.spacing.sm')}`
    }
  },

  // Focus states - accessibility and interaction
  focus: {
    ring: {
      primary: `0 0 0 2px ${cssVarValue('semantic.color.background.default')}, 0 0 0 4px ${cssVarValue('semantic.color.primary.500')}`,
      danger: `0 0 0 2px ${cssVarValue('semantic.color.background.default')}, 0 0 0 4px ${cssVarValue('semantic.color.danger.500')}`,
      success: `0 0 0 2px ${cssVarValue('semantic.color.background.default')}, 0 0 0 4px ${cssVarValue('semantic.color.success.500')}`
    }
  },

  // Dialog/Modal archetypes - overlay components
  dialog: {
    backdrop: {
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)'
    },
    container: {
      background: cssVarValue('semantic.color.background.default'),
      borderRadius: cssVarValue('primitive.radius.lg'),
      boxShadow: cssVarValue('primitive.shadow.xl'),
      border: `1px solid ${cssVarValue('semantic.color.border.subtle')}`
    },
    header: {
      borderBottom: `1px solid ${cssVarValue('semantic.color.border.subtle')}`,
      padding: `${cssVarValue('primitive.spacing.lg')} ${cssVarValue('primitive.spacing.xl')}`
    },
    description: {
      padding: `0 ${cssVarValue('--rag-primitive-spacing-xl')} ${cssVarValue('--rag-primitive-spacing-xl')} ${cssVarValue('--rag-primitive-spacing-xl')}`
    },
    content: {
      padding: cssVarValue('primitive.spacing.xl')
    },
    footer: {
      borderTop: `1px solid ${cssVarValue('semantic.color.border.subtle')}`,
      padding: `${cssVarValue('primitive.spacing.lg')} ${cssVarValue('primitive.spacing.xl')}`
    }
  },

  // Dropdown/Menu archetypes - contextual overlays
  dropdown: {
    container: {
      background: cssVarValue('semantic.color.background.default'),
      borderRadius: cssVarValue('primitive.radius.md'),
      boxShadow: cssVarValue('primitive.shadow.lg'),
      border: `1px solid ${cssVarValue('semantic.color.border.default')}`,
      padding: cssVarValue('primitive.spacing.xs')
    },
    item: {
      default: {
        background: 'transparent',
        color: cssVarValue('semantic.color.text.default'),
        padding: `${cssVarValue('primitive.spacing.sm')} ${cssVarValue('primitive.spacing.md')}`
      },
      hover: {
        background: cssVarValue('semantic.color.background.subtle'),
        color: cssVarValue('semantic.color.text.default')
      },
      active: {
        background: cssVarValue('semantic.color.primary.100'),
        color: cssVarValue('semantic.color.primary.900')
      },
      disabled: {
        background: 'transparent',
        color: cssVarValue('semantic.color.text.disabled'),
        cursor: 'not-allowed'
      }
    },
    separator: {
      background: cssVarValue('semantic.color.border.subtle'),
      height: '1px',
      margin: `${cssVarValue('primitive.spacing.xs')} 0`
    }
  },

  // Notification/Toast archetypes - feedback overlays
  toast: {
    container: {
      background: cssVarValue('semantic.color.background.default'),
      borderRadius: cssVarValue('primitive.radius.md'),
      boxShadow: cssVarValue('primitive.shadow.lg'),
      border: `1px solid ${cssVarValue('semantic.color.border.default')}`,
      padding: cssVarValue('primitive.spacing.md')
    },
    success: {
      background: cssVarValue('semantic.color.success.50'),
      border: `1px solid ${cssVarValue('semantic.color.success.200')}`,
      color: cssVarValue('semantic.color.success.900'),
      iconColor: cssVarValue('semantic.color.success.600')
    },
    warning: {
      background: cssVarValue('semantic.color.warning.50'),
      border: `1px solid ${cssVarValue('semantic.color.warning.200')}`,
      color: cssVarValue('semantic.color.warning.900'),
      iconColor: cssVarValue('semantic.color.warning.600')
    },
    error: {
      background: cssVarValue('semantic.color.danger.50'),
      border: `1px solid ${cssVarValue('semantic.color.danger.200')}`,
      color: cssVarValue('semantic.color.danger.900'),
      iconColor: cssVarValue('semantic.color.danger.600')
    },
    info: {
      background: cssVarValue('semantic.color.primary.50'),
      border: `1px solid ${cssVarValue('semantic.color.primary.200')}`,
      color: cssVarValue('semantic.color.primary.900'),
      iconColor: cssVarValue('semantic.color.primary.600')
    }
  },

  // Form Field archetypes - form component patterns
  formField: {
    label: {
      color: cssVarValue('semantic.color.text.default'),
      fontSize: cssVarValue('primitive.fontSize.sm'),
      fontWeight: '500',
      marginBottom: cssVarValue('primitive.spacing.xs')
    },
    description: {
      color: cssVarValue('semantic.color.text.muted'),
      fontSize: cssVarValue('primitive.fontSize.xs'),
      marginTop: cssVarValue('primitive.spacing.xs')
    },
    error: {
      color: cssVarValue('semantic.color.danger.700'),
      fontSize: cssVarValue('primitive.fontSize.xs'),
      marginTop: cssVarValue('primitive.spacing.xs')
    },
    required: {
      color: cssVarValue('semantic.color.danger.600')
    }
  },

  // Tab Navigation archetypes - tab component patterns
  tabs: {
    container: {
      background: cssVarValue('semantic.color.background.muted'),
      borderRadius: cssVarValue('primitive.radius.xxl'),
      padding: cssVarValue('primitive.spacing.xs'),
      gap: cssVarValue('primitive.spacing.xs')
    },
    trigger: {
      default: {
        background: 'transparent',
        color: cssVarValue('semantic.color.text.subtle'),
        padding: `${cssVarValue('primitive.spacing.xs')} ${cssVarValue('primitive.spacing.md')}`,
        borderRadius: cssVarValue('primitive.radius.xxl'),
        fontSize: cssVarValue('primitive.fontSize.sm'),
        fontWeight: '500'
      },
      hover: {
        color: cssVarValue('semantic.color.text.default')
      },
      active: {
        background: cssVarValue('semantic.color.background.default'),
        color: cssVarValue('semantic.color.text.default'),
        boxShadow: cssVarValue('primitive.shadow.xs')
      },
      disabled: {
        opacity: '0.5',
        cursor: 'not-allowed'
      }
    }
  },

  // Breadcrumb Navigation archetypes - breadcrumb component patterns
  breadcrumb: {
    container: {
      gap: cssVarValue('primitive.spacing.xs'),
      fontSize: cssVarValue('primitive.fontSize.sm')
    },
    item: {
      default: {
        color: cssVarValue('semantic.color.text.muted'),
        textDecoration: 'none'
      },
      hover: {
        color: cssVarValue('semantic.color.text.default')
      },
      current: {
        color: cssVarValue('semantic.color.text.default'),
        fontWeight: '500'
      }
    },
    separator: {
      color: cssVarValue('semantic.color.text.muted'),
      opacity: '0.6'
    }
  },

  // Stats Overview archetypes - data display component patterns
  statsOverview: {
    container: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: cssVarValue('primitive.spacing.xl'),
      minHeight: '80px'
    },
    item: {
      default: {
        background: cssVarValue('semantic.color.background.default'),
        borderRadius: cssVarValue('primitive.radius.lg'),
        padding: cssVarValue('primitive.spacing.lg'),
        transition: 'all 0.15s ease-out',
        minWidth: '200px',
        flexShrink: '1'
      },
      hover: {
        background: cssVarValue('semantic.color.background.subtle')
      },
      clickable: {
        cursor: 'pointer'
      },
      clickableHover: {
        background: cssVarValue('semantic.color.background.subtle'),
        boxShadow: cssVarValue('primitive.shadow.sm'),
        transform: 'translateY(-1px)'
      },
      clickableActive: {
        transform: 'translateY(0)',
        boxShadow: cssVarValue('primitive.shadow.xs')
      },
      selected: {
        background: cssVarValue('semantic.color.primary.100')
      },
      selectedHover: {
        background: cssVarValue('semantic.color.primary.200')
      }
    },
    content: {
      display: 'flex',
      alignItems: 'center',
      gap: cssVarValue('primitive.spacing.md')
    },
    icon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      color: 'white',
      flexShrink: '0'
    },
    info: {
      display: 'flex',
      flexDirection: 'column',
      flex: '1',
      minWidth: '0'
    },
    value: {
      fontSize: cssVarValue('primitive.fontSize.xl'),
      fontWeight: cssVarValue('primitive.fontWeight.semibold'),
      lineHeight: cssVarValue('primitive.lineHeight.tight'),
      color: cssVarValue('semantic.color.text.default')
    },
    label: {
      fontSize: cssVarValue('primitive.fontSize.sm'),
      color: cssVarValue('semantic.color.text.subtle'),
      lineHeight: cssVarValue('primitive.lineHeight.tight'),
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: cssVarValue('primitive.spacing.md'),
      padding: cssVarValue('primitive.spacing.xl'),
      border: `1px solid ${cssVarValue('semantic.color.border.subtle')}`,
      borderRadius: cssVarValue('primitive.radius.lg'),
      background: cssVarValue('semantic.color.background.subtle')
    },
    noStats: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: cssVarValue('primitive.spacing.xl'),
      border: `1px dashed ${cssVarValue('semantic.color.border.subtle')}`,
      borderRadius: cssVarValue('primitive.radius.lg'),
      background: cssVarValue('semantic.color.background.subtle'),
      minWidth: '300px'
    }
  },

  // Overflow Bar archetypes - horizontal scrolling component patterns
  overflowBar: {
    container: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%'
    },
    content: {
      flex: '1',
      overflowX: 'auto',
      overflowY: 'hidden',
      scrollBehavior: 'smooth',
      scrollbarWidth: 'none',
      whiteSpace: 'nowrap',
      display: 'flex',
      alignItems: 'center',
      gap: cssVarValue('primitive.spacing.sm')
    },
    navButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      border: 'none',
      borderRadius: cssVarValue('primitive.radius.md'),
      background: cssVarValue('semantic.color.background.default'),
      color: cssVarValue('semantic.color.text.default'),
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: '10',
      boxShadow: `0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 1px ${cssVarValue('semantic.color.border.default')}`
    },
    navButtonHover: {
      background: cssVarValue('semantic.color.background.subtle'),
      boxShadow: `0 4px 8px rgba(0, 0, 0, 0.15), 0 0 0 1px ${cssVarValue('semantic.color.border.default')}`
    },
    navButtonActive: {
      transform: 'translateY(-50%) scale(0.95)'
    },
    navButtonLeft: {
      left: '8px'
    },
    navButtonRight: {
      right: '8px'
    },
    icon: {
      color: cssVarValue('semantic.color.text.subtle'),
      transition: 'color 0.2s ease'
    },
    iconHover: {
      color: cssVarValue('semantic.color.text.default')
    }
  }
} as const;

// ===== COMPLETE TOKEN SYSTEM =====
export const RagTokens = {
  primitive: PrimitiveTokens,
  semantic: SemanticTokens,
  archetypes: ComponentArchetypes
} as const;

// ===== UTILITY FUNCTIONS =====

// Flatten nested object to dot notation
export function flattenTokens(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenTokens(value, path));
    } else {
      result[path] = String(value);
    }
  }
  
  return result;
}

// Generate CSS variables
export function generateCSSVariables(tokens: any = RagTokens): string {
  const flattened = flattenTokens(tokens);
  return Object.entries(flattened)
    .map(([path, value]) => `  ${cssVar(path)}: ${value};`)
    .join('\n');
}

// Get token by path
export function $dt(path: string): { value: string; cssVar: string } {
  const flattened = flattenTokens(RagTokens);
  const value = flattened[path];
  
  return {
    value: value || '',
    cssVar: cssVar(path)
  };
}

// Inject CSS variables into DOM
export function injectDesignTokens(
  tokens: any = RagTokens,
  selector = ':root'
): void {
  if (typeof document === 'undefined') return;
  
  const cssContent = generateCSSVariables(tokens);
  const styleContent = `${selector} {\n${cssContent}\n}`;
  
  const styleId = `${CSS_VAR_PREFIX}-design-tokens`;
  let styleElement = document.getElementById(styleId) as HTMLStyleElement;
  
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = styleId;
    document.head.appendChild(styleElement);
  }
  
  styleElement.textContent = styleContent;
}

// Helper to combine archetype styles
export function combineArchetypes(...archetypes: Array<Record<string, any>>): Record<string, any> {
  return Object.assign({}, ...archetypes);
}

// Basic types
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ColorName = 'gray' | 'blue' | 'green' | 'red' | 'amber';
export type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'soft';
export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
export type InputState = 'default' | 'focus' | 'error' | 'disabled';
export type CardVariant = 'flat' | 'elevated' | 'floating';
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';
export type SelectState = 'default' | 'focus' | 'error' | 'disabled';
export type ProgressVariant = 'primary' | 'success' | 'warning' | 'danger';
export type SwitchState = 'default' | 'checked' | 'disabled';
export type IconVariant = 'default' | 'subtle' | 'muted' | 'primary' | 'success' | 'warning' | 'danger';
export type SkeletonVariant = 'text' | 'circular' | 'rectangular';
export type FocusVariant = 'primary' | 'danger' | 'success';
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ToastVariant = 'success' | 'warning' | 'error' | 'info';
export type DropdownItemState = 'default' | 'hover' | 'active' | 'disabled';
export type NavigationVariant = 'primary' | 'secondary' | 'minimal';
export type TabNavItemState = 'default' | 'hover' | 'active' | 'disabled';
export type StatsOverviewVariant = 'default' | 'hover' | 'clickable' | 'selected';
export type OverflowBarElement = 'container' | 'content' | 'navButton' | 'icon';