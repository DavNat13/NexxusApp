import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from './theme'

/** Pantalla de marca mientras cargan las fuentes; sin dependencias nativas. */
export function BrandSplash() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.mark}>N</Text>
        <Text style={styles.brand}>NEXXUS</Text>
        <ActivityIndicator color={colors.accent} style={styles.spinner} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  mark: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    color: colors.accentText,
    fontSize: 40,
    fontWeight: '700',
    height: 64,
    lineHeight: 64,
    overflow: 'hidden',
    textAlign: 'center',
    width: 64,
  },
  brand: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 6,
    marginTop: spacing.lg,
  },
  spinner: { marginTop: spacing.xxl },
})
