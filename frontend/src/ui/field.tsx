import { useState, type ReactNode } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native'
import { colors, radii, sizes, spacing, typography } from './theme'

interface FieldProps {
  label: string
  value: string
  onChangeText: (value: string) => void
  onBlur: () => void
  error?: string
  hint?: string
  placeholder?: string
  secureTextEntry?: boolean
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words'
  autoComplete?: TextInputProps['autoComplete']
  textContentType?: TextInputProps['textContentType']
  maxLength?: number
  icon?: ReactNode
}

export function Field({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  hint,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  textContentType,
  maxLength,
  icon,
}: FieldProps) {
  const [focused, setFocused] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const isPassword = Boolean(secureTextEntry)

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused ? styles.focused : null,
          error ? styles.invalid : null,
        ]}
      >
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onBlur()
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={isPassword && !revealed}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          maxLength={maxLength}
          autoCorrect={false}
          accessibilityLabel={label}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setRevealed((current) => !current)}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{revealed ? 'Ocultar' : 'Ver'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: sizes.control,
    paddingHorizontal: spacing.md,
  },
  focused: {
    borderColor: colors.focus,
    shadowColor: colors.focus,
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  invalid: { borderColor: colors.danger },
  icon: { marginRight: spacing.sm },
  input: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingVertical: spacing.md,
  },
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sizes.touch,
    minWidth: sizes.touch,
  },
  toggleText: { ...typography.label, color: colors.accent },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  hint: { ...typography.caption, color: colors.muted, marginTop: spacing.xs },
})
