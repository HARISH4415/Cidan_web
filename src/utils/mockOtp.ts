const configuredDemoOTP = import.meta.env.VITE_DEMO_OTP

export const DEMO_OTP = configuredDemoOTP && /^\d{6}$/.test(configuredDemoOTP)
  ? configuredDemoOTP
  : '123456'

export function verifyMockOTP(code: string) {
  return code === DEMO_OTP
}
