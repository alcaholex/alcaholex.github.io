'use client'

import ProjectsTitle from '../../components/ProjectsTitle'
import Projects from '../../components/Projects'

export default function ProjectsPage() {
  return (
    <main>
      <ProjectsTitle />
      {/* Empty hero gives the 3D title its scroll space, same as the home page. */}
      <section id="section-1" className="h-screen flex items-end justify-center relative z-30 pointer-events-none" data-navbar-theme="light">
      </section>
      <Projects />
    </main>
  )
}
