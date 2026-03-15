/**
 * VIBE DESIGN SYSTEM TOKENS — SINGLE SOURCE OF TRUTH
 * Official monday.com PMO Palette for Simo Intellisense
 * ⚠️ DO NOT HARDCODE COLORS IN COMPONENTS. Import from here.
 */

export const VibeTokens = {
  // ─── COLOR PALETTE ────────────────────────────────────────────────────────
  colors: {
    // Core Brand
    vibePurple:      '#6161FF', // Primary CTAs, active states, branding
    vibePurpleDark:  '#4444CC', // Hover state for purple
    
    // Semantic States
    vibePink:        '#FF3D57', // Critical alerts, destructive actions, stuck state
    vibeGreen:       '#00CA72', // Success, Done, confirmations
    vibeOrange:      '#FDAB3D', // In-progress, warnings, mondayDB limits
    vibeBlue:        '#0086C0', // Info, badges, trust elements
    
    // Backgrounds & Surfaces
    vibeMirage:      '#181B34', // Dark mode background, sidebar
    vibeSurface:     '#FFFFFF', // Content areas (Always white as per HOMESI rules)
    vibeSurface2:    '#F5F6F8', // Hover states, secondary sections
    vibeSurface3:    '#ECEDF0', // Active/Pressed states
    
    // Borders & Text
    vibeBorder:      '#E6E9EF', // Dividers, table borders
    vibeTextPrime:   '#323338', // Primary text
    vibeTextMuted:   '#676879', // Metadata, placeholders
    vibeTextOnDark:  '#FFFFFF', // Text on dark backgrounds (mirage/purple)
    
    // Action Accents
    actionRed:       '#E31837', // HOMESI Corporate Red
    navyBlue:        '#002B5B', // HOMESI Corporate Navy
    cobaltBlue:      '#0047AB', // HOMESI Corporate Cobalt
  },

  // ─── GEOMETRY ─────────────────────────────────────────────────────────────
  radius: {
    xs:   '4px',    // Inputs, checkboxes, buttons
    sm:   '8px',    // Dropdowns, popovers
    md:   '12px',   // Cards
    lg:   '16px',   // Modals, side peek
    xl:   '24px',   // Large containers
    full: '9999px', // Pills, avatars
  },

  // ─── SPACING (Multiples of 4px) ───────────────────────────────────────────
  spacing: {
    xxs:  '4px',
    xs:   '8px',
    small: '12px',
    medium: '16px',
    large: '24px',
    xl:    '32px',
    xxl:   '48px',
  },

  // ─── MOTION ───────────────────────────────────────────────────────────────
  motion: {
    productiveShort:  '70ms',   // Clicks, toggles
    productiveMedium: '100ms',  // Dropdowns, sidebar transitions
    productiveLong:   '150ms',  // Panel openings
    expressiveShort:  '250ms',  // Modal entrances
    expressiveLong:   '400ms',  // Hitos, success celebrations
    
    easeProductive: 'cubic-bezier(0.2, 0, 0.38, 0.9)',
    easeExpressive: 'cubic-bezier(0.4, 0.14, 0.3, 1)',
    easeEntrance:   'cubic-bezier(0, 0, 0.38, 0.9)',
    easeExit:       'cubic-bezier(0.2, 0, 1, 0.9)',
  },

  // ─── TYPOGRAPHY ───────────────────────────────────────────────────────────
  typography: {
    h1: { size: '32px', weight: 700, lineH: 1.14 },
    h2: { size: '24px', weight: 600, lineH: 1.14 },
    h3: { size: '18px', weight: 600, lineH: 1.14 },
    text1: { size: '16px', weight: 400, lineH: 1.5 },
    text2: { size: '14px', weight: 400, lineH: 1.5 }, // MANDATORY MINIMUM BODY
    text3: { size: '12px', weight: 400, lineH: 1.5 }, // METADATA ONLY
  }
} as const;

export type VibeTheme = typeof VibeTokens;
