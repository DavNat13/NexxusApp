import { Platform } from 'react-native'

/**
 * En Android el emulador ve el host como 10.0.2.2. En web e iOS, localhost.
 * En un dispositivo físico hay que definir EXPO_PUBLIC_API_URL con la IP local.
 */
const localhost = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
})

const configured = process.env.EXPO_PUBLIC_API_URL

// Una build de release no puede caer al host de desarrollo ni hablar HTTP.
if (!__DEV__) {
  if (!configured) {
    throw new Error('EXPO_PUBLIC_API_URL es obligatoria en una build de release.')
  }

  if (!configured.startsWith('https://')) {
    throw new Error('EXPO_PUBLIC_API_URL debe usar https en una build de release.')
  }
}

export const API_URL = configured ?? localhost
