/**
 * Sistema visual «Emerald Performance»: esmeralda sobre azul noche.
 * Los valores son la única fuente de color y medidas de la app.
 */
export const colors = {
  background: '#070D18',
  surface: '#0F1A2B',
  elevated: '#16243A',
  border: '#22314A',
  borderStrong: '#31435F',
  text: '#F2F6FC',
  muted: '#9AA8BF',
  accent: '#34D399',
  accentPressed: '#2BBF8B',
  accentText: '#052E22',
  danger: '#F87171',
  dangerText: '#2B0B0B',
  warning: '#FBBF24',
  warningSurface: '#2A2109',
  success: '#4ADE80',
  focus: '#7DD3FC',
  overlay: 'rgba(7, 13, 24, 0.72)',
  transparent: 'transparent',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const

export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
} as const

export const typography = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  h1: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fonts.semibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
} as const

export const sizes = {
  icon: 20,
  touch: 44,
  control: 52,
  otp: 48,
} as const

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
} as const
