import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

/** A page header with a breadcrumb trail, title and description, and duplicate/new action buttons. */
export function PageHeader() {
  return (
    <div className="flex flex-col gap-3 text-foreground">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Projects</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Acme site</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Settings</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="fraunces-text font-heading text-2xl">Project settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage configuration, members, and integrations for this project.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Icon name="content_copy" size={16} /> Duplicate
          </Button>
          <Button>
            <Icon name="add" size={16} /> New
          </Button>
        </div>
      </div>
    </div>
  )
}
