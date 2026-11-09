'use client'

import dynamic from 'next/dynamic'
import TitleSnapshot from '../components/TitleSnapshot'
import Projects from '../components/Projects'
import Art from '../components/Art'
import SlideInSection from '../components/SlideInSection'
import LoadingGate from '../components/LoadingGate'
import FlowTimeline from '../components/FlowTimeline'
import * as sfx from '../components/sound'

// ssr: false splits three.js out of the initial bundle so hydration stays
// light; the snapshots live out here so they're in the prerendered HTML.
const ThreeDModel = dynamic(() => import('../components/ThreeDName'), { ssr: false })

const SOCIALS = [
  { label: 'github', handle: 'alcaholex', href: 'https://github.com/alcaholex' },
  { label: 'instagram', handle: '@alcaholex', href: 'https://www.instagram.com/alcaholex' },
  { label: 'linkedin', handle: 'alex li', href: 'https://www.linkedin.com/in/alex-li-092b14378/' },
  { label: 'email', handle: 'imulixuhang@gmail.com', href: 'mailto:imulixuhang@gmail.com' },
  { label: 'youtube', handle: 'hoiman7074', href: 'https://www.youtube.com/@hoiman7074' },
]

export default function Home() {
  return (
    <LoadingGate>
      <main>
        <TitleSnapshot id="name" />
        <ThreeDModel />
        <section id="section-1" className="h-screen flex items-end justify-center relative z-30 pointer-events-none" data-navbar-theme="light">
        </section>

        <section id="section-2" className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-start justify-center relative" data-navbar-theme="light">

          <div className="mx-auto w-full max-w-[500px] px-6 pt-16 pb-16">
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              i&apos;m a high school student with a passion for design, technology, and engineering. like everything else i create, i had a lot of fun building this portfolio, so i hope you enjoy exploring it!
            </p>
            <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              if you want to learn more about my journey, i built a &quot;timeline&quot; into a metro map...
            </p>

            <div className="relative z-40">
              <FlowTimeline />
            </div>

            <h2 className="mt-20 text-sm font-medium text-gray-900 dark:text-gray-100">elsewhere</h2>

            <div className="relative z-40 mt-4">
              {SOCIALS.map((social) => (
                <div key={social.label} className="flex items-center justify-between py-0.5">
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => sfx.chord('link')}
                    className="text-sm text-gray-500 underline underline-offset-4 decoration-gray-300 transition-colors hover:text-gray-800 dark:text-gray-400 dark:decoration-gray-600 dark:hover:text-gray-200"
                  >
                    {social.label}
                  </a>
                  <span className="text-sm text-gray-400 dark:text-gray-500">{social.handle}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

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
