import type { ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radii, spacing, typography } from './theme'

interface ScreenProps {
  title?: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

/** Contenedor común: marca, área segura, scroll con teclado y footer. */
export function Screen({ title, subtitle, children, footer }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.mark}>
              <Text style={styles.markText}>N</Text>
            </View>
            <Text style={styles.brand}>NEXXUS</Text>
          </View>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  markText: {
    color: colors.accentText,
    fontFamily: typography.h2.fontFamily,
    fontSize: 18,
  },
  brand: {
    color: colors.text,
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    letterSpacing: 4,
  },
  title: { ...typography.display, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: spacing.sm,
  },
  body: { marginTop: spacing.xl },
  footer: { marginTop: spacing.xxl },
})
