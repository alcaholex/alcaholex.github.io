'use client'

import { useState } from 'react'
import ProjectsTitle from './ProjectsTitle'

// A real board's four columns, read across: the year stands in for the time,
// the project for the destination, and status for whether the thing is still
// running. `platform` is the one that earns the conceit outright — a platform
// is where you catch the thing in both senses, so steam and itch.io go in the
// column a number would. Newest first, the way a board shows the next train
// first.
// `status` is free text — 'in service', 'under construction', 'terminated'.
const projects = [
  {
    title: '3d portfolio website',
    year: '2026',
    platform: 'web',
    status: 'under construction',
    image: '/projects/portfolio-site.png',
    alt: '3d portfolio website',
    description: 'portfolio built with next.js and tailwind css, featuring interactive 3d models built with three.js.',
    note: 'this is the website',
  },
  {
    title: 'malfunction',
    year: '2021',
    platform: 'steam',
    status: 'in service',
    image: '/projects/malfunction.png',
    alt: 'malfunction',
    description: 'first-person shooter game developed in unity when i was learning and experimenting with game development.',
    links: [
      { label: 'Live Demo', href: 'https://store.steampowered.com/app/1899790/MALFUNCTION_FPS/' },
      { label: 'GitHub', href: 'https://github.com/alcaholex/MALFUNCTION-FPS' },
    ],
  },
  {
    title: 'interactive cell model',
    year: '2021',
    platform: 'itch.io',
    status: 'in service',
    image: '/projects/cell.png',
    alt: 'interactive cell model',
    description: 'interactive visualization of the animal cell and its organelles; created for an elementary school project.',
    links: [
      { label: 'Live Demo', href: 'https://hoiman6321.itch.io/cell-biology' },
      { label: 'GitHub', href: 'https://github.com/alcaholex/cell-biology' },
    ],
  },
]

// One shared track definition for the header labels and every row, so the two
// stay locked together. Four columns will not fit a phone, so below sm the
// board folds to two lines — time and destination up top, platform and status
// beneath — and the cells are placed explicitly rather than left to flow.
const COLS =
  'grid grid-cols-[2.75rem_1fr_1rem] gap-x-3 gap-y-1 sm:grid-cols-[3rem_1fr_4.5rem_8.5rem_1rem]'
const CELL_TIME = 'col-start-1 row-start-1'
const CELL_DEST = 'col-start-2 row-start-1 min-w-0'
// display:contents at sm+ dissolves this wrapper so its two children become
// grid items in their own columns; below that it is a plain flex row sitting
// on the second line, under the destination.
const CELL_META = 'col-start-2 row-start-2 flex items-baseline gap-3 sm:contents'
const CELL_PLATFORM = 'sm:col-start-3 sm:row-start-1'
const CELL_STATUS = 'sm:col-start-4 sm:row-start-1'
const CELL_END = 'col-start-3 row-start-1 sm:col-start-5'
// Left inset that puts panel content under the destination column (the time
// track plus the gap, at each breakpoint).
const PANEL_INSET = 'pl-[3.5rem] sm:pl-[3.75rem]'

export default function Projects() {
  // One row open at a time, like a board only ever showing one expanded
  // service. null when everything is collapsed.
  const [open, setOpen] = useState(null)

  return (
    // id/data-navbar-theme live on the SlideInSection wrapper, which stays in
    // normal flow while this content is pinned and swiping in.
    <section className="min-h-screen bg-gray-50 flex flex-col justify-start relative z-30">
      {/* The 3D word is the heading; the sr-only h1 keeps it in the document for
          assistive tech and search. It sits outside the container so its canvas
          spans the full width, which is what makes it match the hero's. */}
      <h1 className="sr-only">projects</h1>
      <ProjectsTitle />

      {/* The about section's quiet register and narrow measure, given 60px more
          room than its 500px: four board columns plus a destination wide enough
          for a long project name do not fit inside 500. The two sections are
          never on screen together, so the difference never reads as a
          misalignment. */}
      <div className="mx-auto w-full max-w-[560px] px-6 pb-16">
        {/* Placeholder copy — replace when there is more to say. Left at the
            default layer on purpose, so the glass word still sweeps over it. */}
        <p className="text-sm leading-relaxed text-gray-500">
          i build things for myself. whether it be a game, a
          piece of tech, or a work of art, i&apos;m in it for the making.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gray-500">
          the &quot;departures&quot; list below is a record of the things i&apos;ve made... all aboard!
        </p>

        {/* Lifted above the title's canvas (z-40) inside this section's z-30
            stacking context, so the glass word passes behind the board — and it,
            not the canvas, takes the clicks where the two overlap. */}
        <div className="relative z-50">
          <h2 className="mt-10 text-sm font-medium text-gray-900">departures</h2>

          <div className={`${COLS} mt-6 pb-2 text-[10px] uppercase tracking-[0.08em] text-gray-400`}>
            <span className={CELL_TIME}>time</span>
            <span className={CELL_DEST}>destination</span>
            <span className={CELL_META}>
              <span className={CELL_PLATFORM}>platform</span>
              <span className={CELL_STATUS}>status</span>
            </span>
            <span className={CELL_END} />
          </div>

          {projects.map((project) => {
            const isOpen = open === project.title
            const panelId = `project-${project.title.replace(/\W+/g, '-').toLowerCase()}`
            return (
              <div key={project.title} className="border-t border-gray-200 last:border-b">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : project.title)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className={`group w-full ${COLS} items-baseline py-3 text-left`}
                >
                  <span className={`${CELL_TIME} text-[11px] leading-5 tabular-nums text-gray-400`}>
                    {project.year}
                  </span>
                  <span className={`${CELL_DEST} text-sm font-medium leading-5 text-gray-700 transition-colors group-hover:text-gray-900`}>
                    {project.title}
                  </span>
                  <span className={CELL_META}>
                    <span className={`${CELL_PLATFORM} text-[10px] uppercase tracking-[0.08em] text-gray-500`}>
                      {project.platform}
                    </span>
                    <span className={`${CELL_STATUS} text-[10px] uppercase tracking-[0.08em] text-gray-400`}>
                      {project.status}
                    </span>
                  </span>
                  <svg
                    aria-hidden="true"
                    className={`${CELL_END} mt-0.5 h-4 w-4 self-start text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* 0fr to 1fr is what makes this animate: a grid track can be
                    transitioned where `height: auto` cannot, so the panel opens
                    to its own height without measuring anything. */}
                <div
                  id={panelId}
                  className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <div className={`pb-6 ${PANEL_INSET}`}>
                      <img
                        src={project.image}
                        alt={project.alt}
                        loading="lazy"
                        className="w-full rounded-lg border border-black/10 object-cover"
                      />
                      <p className="mt-3 text-sm leading-relaxed text-gray-500">
                        {project.description}
                      </p>
                      {project.note && (
                        <p className="mt-2 text-[11px] text-gray-400">{project.note}</p>
                      )}
                      {/* Same size and colour as the note above — both are the
                          panel's small print, so they sit on one rhythm rather
                          than the links outranking the description. */}
                      {project.links && (
                        <div className="mt-2 flex gap-4">
                          {project.links.map((link) => (
                            <a
                              key={link.label}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-gray-400 underline underline-offset-4 decoration-gray-300 transition-colors hover:text-gray-800"
                            >
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
