'use client'

import ThreeDModel from '../components/ThreeDName'
import Projects from '../components/Projects'
import Art from '../components/Art'
import SlideInSection from '../components/SlideInSection'
import LoadingGate from '../components/LoadingGate'
import FlowTimeline from '../components/FlowTimeline'

// Rendered as label/value rows (link left, handle right) so the list reads
// like an index rather than a row of buttons.
const SOCIALS = [
  { label: 'github', handle: 'alcaholex', href: 'https://github.com/alcaholex' },
  { label: 'instagram', handle: '@alcaholex', href: 'https://www.instagram.com/alcaholex' },
  { label: 'linkedin', handle: 'alex li', href: 'https://www.linkedin.com/in/alex-li-092b14378/' },
  { label: 'email', handle: 'imulixuhang@gmail.com', href: 'mailto:imulixuhang@gmail.com' },
  { label: 'youtube', handle: 'hoiman7074', href: 'https://www.youtube.com/@hoiman7074' },
]

export default function Home() {
  return (
    // The gate wraps the home page rather than the root layout: the layout also
    // covers /art, /projects and the 404, none of which mount a canvas, so a
    // gate up there would leave them behind a spinner until it timed out.
    <LoadingGate>
      <main>
        <ThreeDModel />
        <section id="section-1" className="h-screen flex items-end justify-center relative z-30 pointer-events-none" data-navbar-theme="light">
        </section>
        {/* Deliberately NOT z-30 like section 1. A z-index here would make this
            section a stacking context, trapping everything inside it below the
            hero canvas (z-40) — including the elsewhere links, which need to
            rise above it to stay clickable. Positioned-with-auto paints in the
            same layer either way, since no section overlaps another. */}
        <section id="section-2" className="min-h-screen bg-gray-50 flex items-start justify-center relative" data-navbar-theme="light">
          {/* One narrow column centred on the page, everything inside it
              left-aligned: small faint-gray body copy under minimal
              same-size subtitles, and label/value rows where the value sits
              flush right in an even fainter gray. */}
          {/* pt-12 is as high as the column can start: any less and the
              navbar's collapsed handle — which hangs from the top edge at
              centre, right over this column — lands on the first line. */}
          <div className="mx-auto w-full max-w-[500px] px-6 pt-12 pb-16">
            <p className="text-sm leading-relaxed text-gray-500">
              i&apos;m a high school student with a passion for design, technology, and engineering.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              i take pride in my ability to learn quickly and adapt to new challenges, which has allowed me to explore a wide range of interests and develop a diverse skillset.
            </p>

            <h2 className="mt-10 text-sm font-medium text-gray-900">currently</h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">building a castle</p>

            <h2 className="mt-10 text-sm font-medium text-gray-900">elsewhere</h2>
            {/* The one thing that outranks the hero canvas. That canvas is
                z-40 and 1.5 screens tall, so its empty lower half lies over
                this part of the column and would swallow every click and hover
                here while the page is still inside the first viewport. z-40
                rather than higher on purpose: equal z-index resolves by DOM
                order, so this lands above the canvas (earlier in the document)
                yet still below the swipe-in panels (later), which must be able
                to sweep over this section. */}
            <div className="relative z-40 mt-4">
              {SOCIALS.map((social) => (
                <div key={social.label} className="flex items-center justify-between py-0.5">
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-500 underline underline-offset-4 decoration-gray-300 transition-colors hover:text-gray-800"
                  >
                    {social.label}
                  </a>
                  <span className="text-sm text-gray-400">{social.handle}</span>
                </div>
              ))}
            </div>

            <FlowTimeline />
          </div>
        </section>
        {/* Projects swipes in from the right and art from the left, once the
            previous section's bottom is reached; the wrappers carry the ids the
            navbar targets. The empty half-viewport spacers push that trigger
            back, so each section gets a beat of plain scroll (over the page's
            own gray-50) before the next panel starts sweeping in. */}
        <div aria-hidden className="h-[50vh]" />
        <SlideInSection id="section-3">
          <Projects />
        </SlideInSection>
        <div aria-hidden className="h-[50vh]" />
        <SlideInSection id="section-4" from="left">
          <Art />
        </SlideInSection>
      </main>
    </LoadingGate>
  )
}
