import { Navbar } from '@/components/quill/navbar'
import { Hero } from '@/components/quill/hero'
import { FeatureSection } from '@/components/quill/feature-section'
import { Pricing } from '@/components/quill/pricing'
import { Testimonial } from '@/components/quill/testimonial'
import { Footer } from '@/components/quill/footer'

// A marketing page, composed: navbar, then one idea per section — hero,
// feature-section, pricing, testimonial — then the footer. Sections breathe at
// the vertical rhythm (`py-24`, `py-12` on mobile) inside the 1400px marketing
// width with `px-12` / `px-6` side padding; blocks that carry their own rhythm
// (hero, feature-section) are left alone.
/** A whole public marketing page, composed: navbar, hero, feature-section, pricing, testimonial and footer, one idea per section. */
export function ExampleMarketingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex flex-1 flex-col">
        <Hero />
        <FeatureSection />
        <section className="mx-auto w-full max-w-page-wide px-6 py-12 md:px-12 md:py-24">
          <Pricing />
        </section>
        <section className="flex justify-center px-6 py-12 md:px-12 md:py-24">
          <Testimonial />
        </section>
      </main>
      <Footer />
    </div>
  )
}
