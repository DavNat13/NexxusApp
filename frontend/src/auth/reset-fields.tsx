import { Controller, type Control } from 'react-hook-form'
import type { ResetFormInput } from './reset-form'
import { Field } from '../ui/field'

/** Los cuatro campos del reset, juntos para no alargar la pantalla. */
export function ResetFields({ control }: { control: Control<ResetFormInput> }) {
  return (
    <>
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
        name="code"
        render={({ field, fieldState }) => (
          <Field
            label="Código"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="123456"
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Field
            label="Contraseña nueva"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="Mínimo 12 caracteres"
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />
      <Controller
        control={control}
        name="confirm"
        render={({ field, fieldState }) => (
          <Field
            label="Repite la contraseña"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="Otra vez"
            secureTextEntry
            autoComplete="new-password"
          />
        )}
      />
    </>
  )
}
