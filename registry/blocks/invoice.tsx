import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToneBadge } from '@/components/ui/tone-badge'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Separator } from '@/components/ui/separator'

const lines = [
  { item: 'Design system retainer — June', qty: 1, rate: '$3,200.00', amount: '$3,200.00' },
  { item: 'Brand lock-up refinements', qty: 6, rate: '$140.00', amount: '$840.00' },
  { item: 'Storybook pattern library', qty: 12, rate: '$95.00', amount: '$1,140.00' },
]

/** A printable invoice card — sender and recipient details, a ToneBadge payment status, a line-item table with totals, and a download action. */
export function Invoice() {
  return (
    <Card className="mx-auto w-full max-w-measure">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="font-heading text-lg text-foreground">Invoice 0042</span>
            <span className="text-sm text-muted-foreground">Issued June 30, 2026 · Due July 14, 2026</span>
          </div>
          <ToneBadge tone="moss">Paid</ToneBadge>
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs tracking-label uppercase text-muted-foreground">From</span>
            <span className="font-medium text-foreground">Craftwell</span>
            <span className="text-muted-foreground">hello@craftwell.ai</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs tracking-label uppercase text-muted-foreground">Billed to</span>
            <span className="font-medium text-foreground">Northwind Ltd.</span>
            <span className="text-muted-foreground">accounts@northwind.com</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => (
              <TableRow key={l.item}>
                <TableCell className="font-medium text-foreground">{l.item}</TableCell>
                <TableCell className="text-right text-muted-foreground">{l.qty}</TableCell>
                <TableCell className="text-right text-muted-foreground">{l.rate}</TableCell>
                <TableCell className="text-right text-foreground">{l.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">$5,180.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-xs text-muted-foreground">Thank you — see you next issue.</span>
        <Button variant="outline" size="sm">
          <Icon name="download" size={16} /> Download PDF
        </Button>
      </CardFooter>
    </Card>
  )
}
