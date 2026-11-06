import { Platform } from 'react-native'

/**
 * En Android el emulador ve el host como 10.0.2.2. En web e iOS, localhost.
 * En un dispositivo físico hay que definir EXPO_PUBLIC_API_URL con la IP local.
 */
const localhost = Platform.select({
  android: 'http://10.0.2.2:3000',
  default: 'http://localhost:3000',
})

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? localhost
