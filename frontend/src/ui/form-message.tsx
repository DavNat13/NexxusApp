import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from './theme'

type MessageVariant = 'error' | 'success' | 'notice'

interface FormMessageProps {
  variant?: MessageVariant
  children: string
}

const tone: Record<MessageVariant, string> = {
  error: colors.danger,
  success: colors.success,
  notice: colors.muted,
}

/** Mensaje de formulario con color y rol accesible según el tono. */
export function FormMessage({ variant = 'error', children }: FormMessageProps) {
  if (!children) return null

  return (
    <View style={[styles.box, { borderColor: tone[variant] }]}>
      <Text
        style={[styles.text, { color: tone[variant] }]}
        accessibilityRole={variant === 'error' ? 'alert' : 'text'}
        accessibilityLiveRegion="polite"
      >
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: { ...typography.caption },
})
