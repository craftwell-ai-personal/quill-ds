import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Icon } from '@/components/ui/icon'

/** A vertical stack of informational, success, and destructive alerts with icons. */
export function Alerts() {
  return (
    <div className="flex max-w-card-xl flex-col gap-4">
      <Alert>
        <Icon name="info" size={18} />
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Your trial ends in 3 days — upgrade to keep your projects.</AlertDescription>
      </Alert>
      <Alert>
        <Icon name="check_circle" size={18} />
        <AlertTitle>Changes saved</AlertTitle>
        <AlertDescription>Your profile has been updated successfully.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <Icon name="warning" size={18} />
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>We couldn’t process your card. Update your billing details.</AlertDescription>
      </Alert>
    </div>
  )
}
