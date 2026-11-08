import { useRef, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, radii, sizes, spacing, typography } from './theme'

interface OtpFieldProps {
  value: string
  onChangeText: (value: string) => void
  onBlur: () => void
  label?: string
  error?: string
}

/**
 * Seis casillas sobre un único input oculto: un solo código, un solo foco
 * y el autocompletado de OTP del sistema sigue funcionando.
 */
export function OtpField({
  value,
  onChangeText,
  onBlur,
  label = 'Código',
  error,
}: OtpFieldProps) {
  const input = useRef<TextInput>(null)
  const [focused, setFocused] = useState(false)
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '')

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => input.current?.focus()}
        style={styles.row}
        accessibilityRole="none"
      >
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.box,
              focused ? styles.focusedBox : null,
              error ? styles.invalid : null,
              digit ? styles.filled : null,
            ]}
          >
            <Text style={styles.digit}>{digit}</Text>
          </View>
        ))}
        <TextInput
          ref={input}
          value={value}
          onChangeText={(next) =>
            onChangeText(next.replace(/\D/g, '').slice(0, 6))
          }
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            onBlur()
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          caretHidden
          style={styles.hidden}
          accessibilityLabel="Código de 6 dígitos"
        />
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { ...typography.label, color: colors.muted, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  box: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    height: sizes.otp,
    justifyContent: 'center',
  },
  focusedBox: { borderColor: colors.focus },
  invalid: { borderColor: colors.danger },
  filled: { backgroundColor: colors.elevated },
  digit: { ...typography.h2, color: colors.text },
  hidden: {
    height: 1,
    opacity: 0,
    position: 'absolute',
    width: 1,
  },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
})
