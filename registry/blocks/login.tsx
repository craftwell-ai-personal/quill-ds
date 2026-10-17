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
import { Checkbox } from '@/components/ui/checkbox'

/** The standard email-and-password sign-in card, with remember-me and a forgot-password escape hatch. */
export function Login() {
  return (
    <Card className="w-card">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back — enter your details to continue.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" placeholder="you@example.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Password</Label>
          <Input id="login-password" type="password" placeholder="••••••••" />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="login-remember" />
          <Label htmlFor="login-remember" className="font-normal">
            Remember me for 30 days
          </Label>
        </div>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button className="w-full">Sign in</Button>
        <Button variant="link" className="w-full">
          Forgot your password?
        </Button>
      </CardFooter>
    </Card>
  )
}
