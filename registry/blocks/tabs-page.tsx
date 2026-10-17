import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

/** A tabbed settings page with account, notifications, and security panels. */
export function TabsPage() {
  return (
    <div className="w-card-xl">
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Update your account details.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-name">Display name</Label>
                <Input id="t-name" defaultValue="Ada Lovelace" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="t-email">Email</Label>
                <Input id="t-email" type="email" defaultValue="ada@example.com" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you hear about.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="t-email-n">Email digests</Label>
                <Switch id="t-email-n" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="t-push">Push notifications</Label>
                <Switch id="t-push" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Keep your account safe.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              <Label htmlFor="t-pass">New password</Label>
              <Input id="t-pass" type="password" placeholder="••••••••" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
