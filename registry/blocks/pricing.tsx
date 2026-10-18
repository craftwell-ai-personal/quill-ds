import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Icon } from '@/components/ui/icon'

const plans = [
  { name: 'Starter', price: '$0', blurb: 'For trying things out.', features: ['1 project', 'Community support', '1 GB storage'], cta: 'Get started', featured: false },
  { name: 'Pro', price: '$18', blurb: 'For growing teams.', features: ['Unlimited projects', 'Priority support', '100 GB storage', 'Analytics'], cta: 'Start free trial', featured: true },
  { name: 'Enterprise', price: 'Custom', blurb: 'For large organizations.', features: ['SSO & SAML', 'Dedicated support', 'Unlimited storage', 'Audit logs'], cta: 'Contact sales', featured: false },
]

/** A three-tier pricing grid with a highlighted popular plan, feature checklists, and per-plan calls to action. */
export function Pricing() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {plans.map((p) => (
        <Card key={p.name} className={p.featured ? 'ring-2 ring-ring' : undefined}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{p.name}</CardTitle>
              {p.featured && <Badge>Popular</Badge>}
            </div>
            <CardDescription>{p.blurb}</CardDescription>
            <div className="pt-2">
              <span className="text-3xl font-medium text-foreground tabular-nums">{p.price}</span>
              {p.price !== 'Custom' && <span className="text-sm text-muted-foreground">/mo</span>}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {p.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                <Icon name="check" className="size-icon-md text-primary" />
                {f}
              </div>
            ))}
          </CardContent>
          <CardFooter className="mt-auto">
            <Button variant={p.featured ? 'default' : 'outline'} className="w-full">
              {p.cta}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
