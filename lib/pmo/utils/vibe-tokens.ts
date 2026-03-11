// ⚠️ Lee ARCHITECTURE.md antes de modificar
// vibe-tokens — Re-exportación de tokens Vibe como constantes TypeScript
// Los tokens de CSS custom properties se definen en app/globals.css
// Este archivo permite usarlos en JS sin romper el sistema de diseño

/**
 * VIBE DESIGN TOKENS — Monday.com palette para PMO
 * Fuente: ARCHITECTURE.md §3, definición oficial en globals.css (:root)
 * 
 * REGLA: NUNCA hardcodear estos valores directamente en componentes.
 * SIEMPRE importar desde aquí o usar las CSS vars (var(--vibe-purple))
 */
export const VIBE_TOKENS = {
  // Core brand
  purple:     "#6161FF",  // --vibe-purple: CTAs, links activos, view tabs activos
  
  // Semantic states
  pink:       "#FF3D57",  // --vibe-pink: Alertas críticas, tareas stuck, destructive
  green:      "#00CA72",  // --vibe-green: Done, éxito, confirmaciones
  orange:     "#FDAB3D",  // --vibe-orange: In-progress, CTAs secundarios, warnings
  blue:       "#0086C0",  // --vibe-blue: Simo IS badges, trust, info
  
  // Backgrounds & surfaces
  mirage:     "#181B34",  // --vibe-mirage: Sidebar oscuro (dark mode future)
  surface:    "#FFFFFF",  // --vibe-surface: Main content area (siempre blanco)
  surface2:   "#F5F6F8",  // --vibe-surface-2: Hover, secondary bg
  
  // Borders & text
  border:     "#E6E9EF",  // --vibe-border: Bordes, divisores
  textPrime:  "#323338",  // --vibe-text-prime: Texto principal (mínimo 14px)
  textMuted:  "#676879",  // --vibe-text-muted: Metadata, timestamps (mínimo 12px)
  
  // HOMESI corporate colors (coexisten con Vibe en el sistema)
  navyBlue:   "#002B5B",  // --navy-blue: HOMESI brand color (sidebar, headers)
  cobaltBlue: "#0047AB",  // --cobalt-blue: HOMESI primary action
  actionRed:  "#E31837",  // --action-red: HOMESI alerts importantes
} as const;

export type VibeToken = keyof typeof VIBE_TOKENS;

/**
 * Retorna una versión semi-transparente de un token Vibe
 * @param token - Clave del token
 * @param opacity - Opacidad 0-100 (se convierte a hex de 2 dígitos)
 */
export function vibeAlpha(token: VibeToken, opacity: number): string {
  const hex = VIBE_TOKENS[token];
  const alpha = Math.round((opacity / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${alpha}`;
}

// CSS variable names (para usar con style={{ color: "var(--vibe-purple)" }})
export const VIBE_VARS = {
  purple:    "var(--vibe-purple)",
  pink:      "var(--vibe-pink)",
  green:     "var(--vibe-green)",
  orange:    "var(--vibe-orange)",
  blue:      "var(--vibe-blue)",
  mirage:    "var(--vibe-mirage)",
  surface:   "var(--vibe-surface)",
  surface2:  "var(--vibe-surface-2)",
  border:    "var(--vibe-border)",
  textPrime: "var(--vibe-text-prime)",
  textMuted: "var(--vibe-text-muted)",
} as const;
