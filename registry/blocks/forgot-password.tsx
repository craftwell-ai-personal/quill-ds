import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

/** A password-reset request card — an email field, a send-link action, and a way back to sign in. */
export function ForgotPassword() {
  return (
    <Card className="w-card">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the email you signed up with and we&rsquo;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input id="forgot-email" type="email" placeholder="you@example.com" />
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">Send reset link</Button>
        <Button variant="ghost" className="w-full">
          <Icon name="arrow_back" size={16} /> Back to sign in
        </Button>
      </CardFooter>
    </Card>
  )
}
