import { useRef, type ClipboardEvent, type ChangeEvent, type KeyboardEvent } from 'react'
import './OTPInput.css'

const OTP_LENGTH = 6

type OTPInputProps = {
  value: string
  onChange: (value: string) => void
  invalid?: boolean
}

function OTPInput({ value, onChange, invalid = false }: OTPInputProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '')

  function focusInput(index: number) {
    inputs.current[index]?.focus()
    inputs.current[index]?.select()
  }

  function updateDigit(index: number, rawValue: string) {
    const enteredDigits = rawValue.replace(/\D/g, '')
    if (!enteredDigits) {
      const next = [...digits]
      next[index] = ''
      onChange(next.join(''))
      return
    }

    const next = [...digits]
    enteredDigits.slice(0, OTP_LENGTH - index).split('').forEach((digit, offset) => {
      next[index + offset] = digit
    })
    onChange(next.join(''))
    focusInput(Math.min(index + enteredDigits.length, OTP_LENGTH - 1))
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    updateDigit(index, event.target.value)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ''
      onChange(next.join(''))
      focusInput(index - 1)
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusInput(index - 1)
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      focusInput(index + 1)
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pastedDigits) return

    const startIndex = pastedDigits.length >= OTP_LENGTH ? 0 : index
    updateDigit(startIndex, pastedDigits)
  }

  return (
    <div className={`otp-inputs${invalid ? ' otp-inputs--invalid' : ''}`} role="group" aria-label="6-digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => { inputs.current[index] = element }}
          id={`verification-digit-${index + 1}`}
          className="otp-digit"
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1}`}
          aria-invalid={invalid}
          maxLength={1}
          value={digit}
          autoFocus={index === 0}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
        />
      ))}
    </div>
  )
}

export { OTPInput }
