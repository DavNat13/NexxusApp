import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from './theme'

interface OfflineBannerProps {
  visible: boolean
  message?: string
}

/** Aviso no bloqueante para fallos de red: la sesión local se conserva. */
export function OfflineBanner({
  visible,
  message = 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
}: OfflineBannerProps) {
  if (!visible) return null

  return (
    <View
      style={styles.banner}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSurface,
    borderColor: colors.warning,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: { ...typography.caption, color: colors.warning },
})
