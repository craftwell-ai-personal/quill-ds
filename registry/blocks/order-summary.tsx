import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Icon } from '@/components/ui/icon'

const lines = [
  { name: 'Pro plan (annual)', qty: 1, price: '$180.00' },
  { name: 'Extra seats × 3', qty: 3, price: '$54.00' },
  { name: 'Priority support', qty: 1, price: '$24.00' },
]

/** A checkout order-summary card — line items, a promo code field, a total, and a pay-now button. */
export function OrderSummary() {
  return (
    <Card className="w-card">
      <CardHeader>
        <CardTitle>Order summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lines.map((l) => (
          <div key={l.name} className="flex items-center justify-between text-sm">
            <span className="text-foreground">{l.name}</span>
            <span className="text-muted-foreground tabular-nums">{l.price}</span>
          </div>
        ))}
        <Separator />
        <div className="flex items-center gap-2">
          <Input placeholder="Promo code" className="flex-1" />
          <Button variant="outline">Apply</Button>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total due today</span>
          <span className="text-lg font-medium text-foreground tabular-nums">$258.00</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">
          <Icon name="credit_card" size={16} /> Pay now
        </Button>
      </CardFooter>
    </Card>
  )
}
