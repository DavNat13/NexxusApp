import { useState } from 'react'
import { Link } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  requestPasswordResetInput,
  type RequestPasswordResetInput,
} from '@nexxus/shared'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text } from 'react-native'
import { errorMessage } from '../../src/api/errors'
import { trpc } from '../../src/api/trpc'
import { Button } from '../../src/ui/button'
import { Field } from '../../src/ui/field'
import { Screen } from '../../src/ui/screen'
import { colors, spacing } from '../../src/ui/theme'

export default function ForgotPasswordScreen() {
  const request = trpc.auth.requestPasswordReset.useMutation()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { control, handleSubmit, getValues } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetInput),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setBusy(true)

    try {
      await request.mutateAsync(values)
      setSent(true)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  })

  if (sent) {
    return (
      <Screen
        title="Revisa tu correo"
        subtitle="Si el correo existe, recibirás un código de 6 dígitos."
      >
        <Link
          href={{
            pathname: '/reset-password',
            params: { email: getValues('email') },
          }}
          style={styles.link}
        >
          Introducir el código
        </Link>
        <Link href="/login" style={styles.secondary}>
          Volver a entrar
        </Link>
      </Screen>
    )
  }

  return (
    <Screen
      title="Recuperar contraseña"
      subtitle="Te enviaremos un código para elegir una contraseña nueva."
    >
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Field
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoComplete="email"
          />
        )}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Enviar código" onPress={onSubmit} loading={busy} />
      <Link href="/login" style={styles.link}>
        Volver a entrar
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  link: { color: colors.accent, marginTop: spacing.lg, textAlign: 'center' },
  secondary: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
})
