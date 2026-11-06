import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ApiProvider } from '../src/api/provider'
import { useAuthGuard } from '../src/auth/guard'
import { SessionProvider } from '../src/auth/session'

function RootNavigator() {
  useAuthGuard()

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ApiProvider>
        <SessionProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </SessionProvider>
      </ApiProvider>
    </SafeAreaProvider>
  )
}
