import type { ReactNode } from 'react'
import { Link, type Href } from 'expo-router'
import { StyleSheet } from 'react-native'
import { colors, sizes, typography } from './theme'

interface AppLinkProps {
  href: Href
  children: ReactNode
  tone?: 'accent' | 'muted'
  align?: 'center' | 'left'
}

/** Enlace de navegación con área táctil mínima y tono consistente. */
export function AppLink({
  href,
  children,
  tone = 'accent',
  align = 'center',
}: AppLinkProps) {
  return (
    <Link
      href={href}
      style={[
        styles.base,
        tone === 'muted' ? styles.muted : styles.accent,
        align === 'left' ? styles.left : styles.center,
      ]}
    >
      {children}
    </Link>
  )
}

const styles = StyleSheet.create({
  base: {
    ...typography.label,
    minHeight: sizes.touch,
    paddingVertical: 12,
  },
  accent: { color: colors.accent },
  muted: { color: colors.muted },
  center: { textAlign: 'center' },
  left: { textAlign: 'left' },
})
