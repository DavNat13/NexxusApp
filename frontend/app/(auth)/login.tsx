import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginInput, type LoginInput } from '@nexxus/shared'
import { Controller, useForm } from 'react-hook-form'
import { errorMessage, isOfflineError } from '../../src/api/errors'
import { useSession } from '../../src/auth/session'
import { AppLink } from '../../src/ui/app-link'
import { Button } from '../../src/ui/button'
import { Card } from '../../src/ui/card'
import { Field } from '../../src/ui/field'
import { FormMessage } from '../../src/ui/form-message'
import { OfflineBanner } from '../../src/ui/offline-banner'
import { Screen } from '../../src/ui/screen'

export default function LoginScreen() {
  const { signIn } = useSession()
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [busy, setBusy] = useState(false)

  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginInput),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setOffline(false)
    setBusy(true)

    try {
      await signIn(values)
    } catch (failure) {
      if (isOfflineError(failure)) setOffline(true)
      else setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  })

  return (
    <Screen
      title="Entrar"
      subtitle="Tu entrenamiento, con la carga justa."
      footer={
        <AppLink href="/register" tone="muted">
          ¿No tienes cuenta? Crear una
        </AppLink>
      }
    >
      <OfflineBanner visible={offline} />
      <Card>
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
        {error ? <FormMessage>{error}</FormMessage> : null}
        <Button label="Entrar" onPress={onSubmit} loading={busy} />
        <AppLink href="/forgot-password">¿Olvidaste tu contraseña?</AppLink>
      </Card>
    </Screen>
  )
}
