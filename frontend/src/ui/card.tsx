import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { colors, radii, shadows, spacing } from './theme'

interface CardProps {
  children: ReactNode
  elevated?: boolean
}

export function Card({ children, elevated = false }: CardProps) {
  return (
    <View style={[styles.card, elevated ? styles.elevated : null]}>{children}</View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xl,
  },
  elevated: {
    ...shadows.card,
    backgroundColor: colors.elevated,
  },
})
