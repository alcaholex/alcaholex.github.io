'use client'

import ArtTitle from '../../components/ArtTitle'
import Art from '../../components/Art'

export default function ArtPage() {
  return (
    <main>
      <ArtTitle />
      {/* Empty hero gives the 3D title its scroll space, same as the home page. */}
      <section id="section-1" className="h-screen flex items-end justify-center relative z-30 pointer-events-none" data-navbar-theme="light">
      </section>
      <Art />
    </main>
  )
}
