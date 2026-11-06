import { useState } from 'react'
import { Link } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerInput, type RegisterInput } from '@nexxus/shared'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text } from 'react-native'
import { errorMessage } from '../../src/api/errors'
import { useSession } from '../../src/auth/session'
import { Button } from '../../src/ui/button'
import { Field } from '../../src/ui/field'
import { Screen } from '../../src/ui/screen'
import { colors, spacing } from '../../src/ui/theme'

export default function RegisterScreen() {
  const { signUp } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { control, handleSubmit } = useForm<RegisterInput>({
    resolver: zodResolver(registerInput),
    defaultValues: { name: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setBusy(true)

    try {
      await signUp(values)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  })

  return (
    <Screen title="Crear cuenta" subtitle="Registra tus entrenamientos desde el primer día.">
      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Field
            label="Nombre"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="Cómo te llamas"
            autoCapitalize="words"
            autoComplete="name"
          />
        )}
      />
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
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Field
            label="Contraseña"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="Mínimo 12 caracteres"
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Crear cuenta" onPress={onSubmit} loading={busy} />
      <Link href="/login" style={styles.link}>
        Ya tengo cuenta
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  link: { color: colors.accent, marginTop: spacing.lg, textAlign: 'center' },
})
