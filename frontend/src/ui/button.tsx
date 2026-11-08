import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors, radii, sizes, spacing, typography } from './theme'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'md' | 'lg'

interface ButtonProps {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const spinnerColor: Record<ButtonVariant, string> = {
  primary: colors.accentText,
  secondary: colors.text,
  ghost: colors.accent,
  danger: colors.dangerText,
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'lg',
}: ButtonProps) {
  const [hovered, setHovered] = useState(false)
  const blocked = disabled || loading

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={blocked}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.md : styles.lg,
        variantStyle[variant],
        hovered && !blocked ? styles.hovered : null,
        pressed && !blocked ? styles.pressed : null,
        blocked ? styles.disabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor[variant]} />
      ) : (
        <Text style={[styles.label, labelStyle[variant]]}>{label}</Text>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  md: { minHeight: sizes.touch },
  lg: { minHeight: sizes.control },
  primary: { backgroundColor: colors.accent },
  secondary: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderWidth: 1,
  },
  ghost: { backgroundColor: colors.transparent },
  danger: { backgroundColor: colors.danger },
  hovered: { opacity: 0.92 },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: { ...typography.button },
  primaryLabel: { color: colors.accentText },
  secondaryLabel: { color: colors.text },
  ghostLabel: { color: colors.accent },
  dangerLabel: { color: colors.dangerText },
})

const variantStyle = StyleSheet.create({
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
})

const labelStyle = StyleSheet.create({
  primary: styles.primaryLabel,
  secondary: styles.secondaryLabel,
  ghost: styles.ghostLabel,
  danger: styles.dangerLabel,
})
