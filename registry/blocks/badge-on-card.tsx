import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/** Default, secondary, and destructive badges shown together on a card surface. */
export function BadgeOnCard() {
  return (
    <Card className="w-card-sm">
      <CardContent className="flex gap-2">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </CardContent>
    </Card>
  )
}
