import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

/** A six-digit one-time-passcode entry card for verifying an email, with expiry messaging and a resend action. */
export function OtpVerification() {
  return (
    <Card className="w-card">
      <CardHeader className="text-center">
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          We sent a six-digit code to <span className="text-foreground">ada@example.com</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <Label htmlFor="otp-code" className="sr-only">
          Verification code
        </Label>
        <InputOTP id="otp-code" maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        <p className="text-xs text-muted-foreground">The code expires in 10 minutes.</p>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">Verify</Button>
        <Button variant="link" className="w-full">
          Didn&rsquo;t get it? Resend code
        </Button>
      </CardFooter>
    </Card>
  )
}
