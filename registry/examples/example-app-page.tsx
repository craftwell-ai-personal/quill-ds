import { SidebarNav } from '@/components/quill/sidebar-nav'
import { PageHeader } from '@/components/quill/page-header'
import { StatCards } from '@/components/quill/stat-cards'
import { DataTable } from '@/components/quill/data-table'

// An app page, composed: the sidebar-nav shell frames the page, page-header
// says what the page is about, and stat-cards and the data-table sit inside
// that frame in reading order. The shell stacks its children on `gap-6` —
// components sit on `--space-4` / `--space-6`, and nothing here needs more.
/** A whole signed-in app page, composed: the sidebar-nav shell around a page-header, then stat-cards, then a data-table. */
export function ExampleAppPage() {
  return (
    <SidebarNav>
      <PageHeader />
      <StatCards />
      <DataTable />
    </SidebarNav>
  )
}
