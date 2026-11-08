import { useEffect, useState } from 'react'
import { Link, useLocalSearchParams } from 'expo-router'
import { zodResolver } from '@hookform/resolvers/zod'
import { requestPasswordResetInput } from '@nexxus/shared'
import { useForm } from 'react-hook-form'
import { StyleSheet, Text, View } from 'react-native'
import { errorMessage } from '../../src/api/errors'
import { trpc } from '../../src/api/trpc'
import { ResetFields } from '../../src/auth/reset-fields'
import { resetFormSchema, type ResetFormInput } from '../../src/auth/reset-form'
import { useSession } from '../../src/auth/session'
import { Button } from '../../src/ui/button'
import { Screen } from '../../src/ui/screen'
import { colors, spacing } from '../../src/ui/theme'

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>()
  const { clearLocalSession } = useSession()
  const reset = trpc.auth.resetPassword.useMutation()
  const request = trpc.auth.requestPasswordReset.useMutation()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [seconds, setSeconds] = useState(0)

  const { control, handleSubmit, getValues } = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: {
      email: params.email ?? '',
      code: '',
      password: '',
      confirm: '',
    },
  })

  useEffect(() => {
    if (seconds === 0) return

    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [seconds])

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    setBusy(true)

    try {
      await reset.mutateAsync({
        email: values.email,
        code: values.code,
        password: values.password,
      })
      await clearLocalSession()
      setDone(true)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  })

  async function resend(): Promise<void> {
    const address = getValues('email')

    if (!requestPasswordResetInput.safeParse({ email: address }).success) {
      setError('Escribe un email válido.')
      return
    }

    setError(null)
    setNotice(null)
    setResending(true)

    try {
      await request.mutateAsync({ email: address })
      setNotice('Si el correo existe, recibirás un código nuevo.')
      setSeconds(60)
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setResending(false)
    }
  }

  if (done) {
    return (
      <Screen
        title="Contraseña actualizada"
        subtitle="Todas las sesiones abiertas se cerraron. Entra con la contraseña nueva."
      >
        <Link href="/login" style={styles.link}>
          Volver a entrar
        </Link>
      </Screen>
    )
  }

  return (
    <Screen
      title="Elige una contraseña nueva"
      subtitle="Escribe el código que enviamos a tu correo."
    >
      <ResetFields control={control} />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Button label="Cambiar contraseña" onPress={onSubmit} loading={busy} />
      <View style={styles.resend}>
        <Button
          label={
            seconds > 0 ? `Reenviar código (${seconds} s)` : 'Reenviar código'
          }
          onPress={() => void resend()}
          loading={resending}
          disabled={seconds > 0}
          variant="ghost"
        />
      </View>
      <Link href="/login" style={styles.link}>
        Volver a entrar
      </Link>
    </Screen>
  )
}

const styles = StyleSheet.create({
  error: { color: colors.danger, marginBottom: spacing.md },
  notice: { color: colors.muted, marginBottom: spacing.md },
  resend: { marginTop: spacing.md },
  link: { color: colors.accent, marginTop: spacing.lg, textAlign: 'center' },
})
