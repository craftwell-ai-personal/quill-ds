import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

/** A profile settings card — name fields, a bio textarea, and an email-notification toggle. */
export function Settings() {
  return (
    <Card className="w-card-xl">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your public profile and notification preferences.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-first">First name</Label>
            <Input id="s-first" defaultValue="Ada" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-last">Last name</Label>
            <Input id="s-last" defaultValue="Lovelace" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="s-bio">Bio</Label>
          <Textarea id="s-bio" placeholder="Tell us a little about yourself…" />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <Label htmlFor="s-notify">Email notifications</Label>
            <span className="text-sm text-muted-foreground">Get notified about activity.</span>
          </div>
          <Switch id="s-notify" defaultChecked />
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button>Save changes</Button>
      </CardFooter>
    </Card>
  )
}
