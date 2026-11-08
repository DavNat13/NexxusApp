import { useState } from 'react'
import { Link } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginInput, type LoginInput } from '@nexxus/shared'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, Text } from 'react-native'
import { errorMessage } from '../../src/api/errors'
import { useSession } from '../../src/auth/session'
import { Button } from '../../src/ui/button'
import { Field } from '../../src/ui/field'
import { Screen } from '../../src/ui/screen'
import { colors, spacing } from '../../src/ui/theme'

export default function LoginScreen() {
  const { signIn } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginInput),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setBusy(true)

    try {
      await signIn(values)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  })

  return (
    <Screen title="Entrar" subtitle="Tu entrenamiento, con la carga justa.">
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
            placeholder="Tu contraseña"
            secureTextEntry
            autoComplete="password"
          />
        )}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Entrar" onPress={onSubmit} loading={busy} />
      <Link href="/forgot-password" style={styles.link}>
        ¿Olvidaste tu contraseña?
      </Link>
      <Link href="/register" style={styles.secondary}>
        ¿No tienes cuenta? Crear una
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  link: { color: colors.accent, marginTop: spacing.lg, textAlign: 'center' },
  secondary: { color: colors.muted, marginTop: spacing.md, textAlign: 'center' },
})
