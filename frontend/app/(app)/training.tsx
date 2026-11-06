import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSession } from '../../src/auth/session'
import { Button } from '../../src/ui/button'
import { Screen } from '../../src/ui/screen'
import { colors, spacing } from '../../src/ui/theme'

export default function TrainingScreen() {
  const { user, signOut } = useSession()
  const [busy, setBusy] = useState(false)

  async function onSignOut(): Promise<void> {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title={`Hola, ${user?.name ?? 'atleta'}`} subtitle={user?.email}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tu entrenamiento empieza aquí</Text>
        <Text style={styles.cardText}>
          La sesión de hoy, el historial y las sugerencias de carga llegan en la
          siguiente etapa.
        </Text>
      </View>
      <Button label="Cerrar sesión" variant="ghost" onPress={onSignOut} loading={busy} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  cardText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
})
