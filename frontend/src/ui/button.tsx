import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, spacing } from './theme'

interface ButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'ghost'
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: ButtonProps) {
  const blocked = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.base,
        variant === 'ghost' ? styles.ghost : styles.primary,
        pressed && !blocked ? styles.pressed : null,
        blocked ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.accent : colors.accentText} />
      ) : (
        <Text style={[styles.label, variant === 'ghost' ? styles.ghostLabel : null]}>
          {label}
        </Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  primary: { backgroundColor: colors.accent },
  ghost: { borderColor: colors.border, borderWidth: 1 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
  ghostLabel: { color: colors.text },
})
