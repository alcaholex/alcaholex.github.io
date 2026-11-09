'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import TitleSnapshot from './TitleSnapshot'

const ProjectsTitle = dynamic(() => import('./ProjectsTitle'), { ssr: false })
import * as sfx from './sound'

const projects = [
  {
    title: '\"blades\"',
    year: '2026',
    platform: 'art',
    status: 'under construction',
    image: '/projects/mantis.webp',
    alt: 'robot renders',
    description: 'a mechanical linkage mounted to a person\'s forearm, designed to extend and retract a blade. inspired by cyberpunk 2077.',
    note: 'still working on this one!',
  },
  {
    title: 'robot renders',
    year: '2026',
    platform: 'art',
    status: 'in service',
    image: '/projects/2053x.webp',
    alt: 'robot renders',
    description: 'a collection of vex robot renders. includes a climbing animation.',
    note: 'blender - autodesk fusion',
    links: [
      { label: 'instagram', href: 'https://www.instagram.com/p/DYdmqFslvsi/' },
    ],
  },
  {
    title: '3d portfolio website',
    year: '2025',
    platform: 'web',
    status: 'under construction',
    image: '/projects/portfolio-site.webp',
    alt: '3d portfolio website',
    description: 'portfolio built with next.js and tailwind css, featuring interactive 3d models built with three.js.',
    note: 'next.js - tailwind css - three.js',
  },
  {
    title: 'robotics simulator',
    year: '2025',
    platform: 'sim',
    status: 'terminated',
    image: '/projects/sim.webp',
    alt: 'robotics simulator',
    description: 'a simulator for vex robots with an emphasis on realistic physics and accurate motor control.',
    note: 'unity - blender - autodesk fusion',
  },
  {
    title: 'team qwerty 3004a',
    year: '2024',
    platform: 'vex',
    status: 'in service',
    image: '/projects/3004a.webp',
    alt: 'team qwerty 3004a',
    description: 'the robotics team i founded and lead, competing in the vex robotics competition.',
    links: [
      { label: 'events.vex.com', href: 'https://events.vex.com/teams/V5RC/3004A' },
      { label: 'instagram', href: 'https://www.instagram.com/vrc_3004a' },
    ],
  },
  {
    title: 'interactive cell model',
    year: '2022',
    platform: 'game',
    status: 'in service',
    image: '/projects/cell.webp',
    alt: 'interactive cell model',
    description: 'interactive visualization of the animal cell and its organelles; created for an elementary school project.',
    note: 'unity - blender',
    links: [
      { label: 'live demo', href: 'https://hoiman6321.itch.io/cell-biology' },
      { label: 'github', href: 'https://github.com/alcaholex/cell-biology' },
    ],
  },
  {
    title: 'malfunction',
    year: '2021',
    platform: 'game',
    status: 'in service',
    image: '/projects/malfunction.webp',
    alt: 'malfunction',
    description: 'first-person shooter game created during my beginner days of game development.',
    note: 'unity - blender',
    links: [
      { label: 'live demo', href: 'https://store.steampowered.com/app/1899790/MALFUNCTION_FPS/' },
      { label: 'github', href: 'https://github.com/alcaholex/MALFUNCTION-FPS' },
    ],
  },
]

const COLS =
  'grid grid-cols-[2.75rem_1fr_1rem] gap-x-3 gap-y-1 sm:grid-cols-[3rem_1fr_4.5rem_8.5rem_1rem]'
const CELL_TIME = 'col-start-1 row-start-1'
const CELL_DEST = 'col-start-2 row-start-1 min-w-0'

const CELL_META = 'col-start-2 row-start-2 flex items-baseline gap-3 sm:contents'
const CELL_PLATFORM = 'sm:col-start-3 sm:row-start-1'
const CELL_STATUS = 'sm:col-start-4 sm:row-start-1'
const CELL_END = 'col-start-3 row-start-1 sm:col-start-5'

const PANEL_INSET = 'pl-[3.5rem] sm:pl-[3.75rem]'

export default function Projects() {
  const [open, setOpen] = useState(null)

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col justify-start relative z-30">

      <h1 className="sr-only">projects</h1>
      <div className="relative w-full h-screen shrink-0">
        <TitleSnapshot id="projects" />
        <ProjectsTitle />
      </div>

      <div className="mx-auto w-full max-w-[560px] px-6 pb-16">

        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          i love building. i notice that the more effort i invest in a project, the more fulfilling it is to complete. they&apos;re like brainchildren.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          the &quot;departures&quot; list below is a record of the things i&apos;ve made... all aboard!
        </p>

        <div className="relative z-50">
          <h2 className="mt-10 text-sm font-medium text-gray-900 dark:text-gray-100">departures</h2>

          <div className={`${COLS} mt-6 pb-2 text-[10px] uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500`}>
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
              <div key={project.title} className="border-t border-gray-200 last:border-b dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    sfx.chord(isOpen ? 'boardClose' : 'boardOpen')
                    setOpen(isOpen ? null : project.title)
                  }}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  data-sfx-hover="heavy"
                  className={`group w-full ${COLS} items-baseline py-3 text-left`}
                >
                  <span className={`${CELL_TIME} text-[11px] leading-5 tabular-nums text-gray-400 dark:text-gray-500`}>
                    {project.year}
                  </span>
                  <span className={`${CELL_DEST} text-sm font-medium leading-5 text-gray-700 transition-colors group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-gray-100`}>
                    {project.title}
                  </span>
                  <span className={CELL_META}>
                    <span className={`${CELL_PLATFORM} text-[10px] uppercase tracking-[0.08em] text-gray-500 dark:text-gray-400`}>
                      {project.platform}
                    </span>
                    <span className={`${CELL_STATUS} text-[10px] uppercase tracking-[0.08em] text-gray-400 dark:text-gray-500`}>
                      {project.status}
                    </span>
                  </span>
                  <svg
                    aria-hidden="true"
                    className={`${CELL_END} mt-0.5 h-4 w-4 self-start text-gray-400 transition-transform duration-300 dark:text-gray-500 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div
                  id={panelId}
                  className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                >
                  <div className="overflow-hidden">
                    <div className={`pb-6 ${PANEL_INSET}`}>
                      {project.image && (
                        <img
                          src={project.image}
                          alt={project.alt}
                          loading="lazy"
                          className="w-full rounded-lg border border-black/10 dark:border-white/10"
                        />
                      )}
                      <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                        {project.description}
                      </p>
                      {project.note && (
                        <p className="mt-2 text-[11px] text-gray-400 dark:text-gray-500">{project.note}</p>
                      )}

                      {project.links && (
                        <div className="mt-2 flex gap-4">
                          {project.links.map((link) => (
                            <a
                              key={link.label}
                              href={link.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-gray-400 underline underline-offset-4 decoration-gray-300 transition-colors hover:text-gray-800 dark:text-gray-500 dark:decoration-gray-600 dark:hover:text-gray-200"
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
