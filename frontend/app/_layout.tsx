import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  useFonts,
} from '@expo-google-fonts/archivo'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ApiProvider } from '../src/api/provider'
import { useAuthGuard } from '../src/auth/guard'
import { SessionProvider } from '../src/auth/session'
import { BrandSplash } from '../src/ui/brand-splash'

function RootNavigator() {
  useAuthGuard()

  return <Stack screenOptions={{ headerShown: false }} />
}

function Root() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  })

  if (!fontsLoaded) return <BrandSplash />

  return (
    <ApiProvider>
      <SessionProvider>
        <RootNavigator />
        <StatusBar style="light" />
      </SessionProvider>
    </ApiProvider>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  )
}
