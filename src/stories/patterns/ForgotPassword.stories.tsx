import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ForgotPassword as ForgotPasswordBlock } from '@registry/blocks/forgot-password'
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
import { usage } from '@/usage/forgot-password.usage.mjs'
import { renderUsageDocs } from '@/usage/render.mjs'
import { DoDontPair } from '../DoDont'

const meta = {
  title: 'Patterns / Auth / Forgot password',
  component: ForgotPasswordBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: renderUsageDocs(usage) } },
  },
} satisfies Meta<typeof ForgotPasswordBlock>
export default meta
type Story = StoryObj<typeof meta>

export const ForgotPassword: Story = {
  render: () => <ForgotPasswordBlock />,
}

export const DoDont: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => (
    <DoDontPair
      usage={usage}
      id="always-offer-a-way-back"
      doExample={
        <Card className="w-[300px]">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter your email and we&rsquo;ll send a reset link.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dodont-forgot-do-email">Email</Label>
              <Input id="dodont-forgot-do-email" type="email" placeholder="you@example.com" />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button className="w-full">Send reset link</Button>
            <Button variant="ghost" className="w-full">
              <Icon name="arrow_back" /> Back to sign in
            </Button>
          </CardFooter>
        </Card>
      }
      dontExample={
        <Card className="w-[300px]">
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter your email and we&rsquo;ll send a reset link.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dodont-forgot-dont-email">Email</Label>
              <Input id="dodont-forgot-dont-email" type="email" placeholder="you@example.com" />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Send reset link</Button>
          </CardFooter>
        </Card>
      }
    />
  ),
}
