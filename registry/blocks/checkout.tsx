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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Icon } from '@/components/ui/icon'

/** A two-column checkout — payment method picker and card form beside an order summary sidebar. */
export function Checkout() {
  return (
    <div className="mx-auto grid w-full max-w-page grid-cols-[1fr_var(--size-panel)] items-start gap-6 max-md:grid-cols-1">
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <CardDescription>All transactions are encrypted end to end.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <RadioGroup defaultValue="card" className="grid grid-cols-3 gap-2" aria-label="Payment method">
            {[
              { value: 'card', label: 'Card', icon: 'credit_card' },
              { value: 'bank', label: 'Bank', icon: 'account_balance' },
              { value: 'wallet', label: 'Wallet', icon: 'wallet' },
            ].map((m) => (
              <Label
                key={m.value}
                htmlFor={`pay-${m.value}`}
                className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-border p-3 font-medium transition-colors has-data-checked:border-ring has-data-checked:bg-muted"
              >
                <RadioGroupItem id={`pay-${m.value}`} value={m.value} className="sr-only" />
                <Icon name={m.icon as never} size={20} className="text-muted-foreground" aria-hidden />
                {m.label}
              </Label>
            ))}
          </RadioGroup>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkout-name">Name on card</Label>
            <Input id="checkout-name" placeholder="Ada Lovelace" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="checkout-number">Card number</Label>
            <Input id="checkout-number" inputMode="numeric" placeholder="1234 5678 9012 3456" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-expiry">Expiry</Label>
              <Input id="checkout-expiry" placeholder="MM / YY" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="checkout-cvc">CVC</Label>
              <Input id="checkout-cvc" inputMode="numeric" placeholder="123" />
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button className="w-full">
            Pay $58.00 <Icon name="lock" size={14} />
          </Button>
        </CardFooter>
      </Card>
      {/* Default size, like Payment beside it, so the two titles share a top edge and a size. */}
      <Card>
        <CardHeader>
          <CardTitle>Order summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">The Brief, annual</span>
            <span className="text-foreground tabular-nums">$48.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Additional seats</span>
            <span className="text-foreground tabular-nums">$14.00</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Early-bird discount</span>
            <span className="text-foreground tabular-nums">−$4.00</span>
          </div>
          <Separator className="my-2" />
          <div className="flex justify-between font-medium">
            <span className="text-foreground">Total</span>
            <span className="text-foreground tabular-nums">$58.00</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
