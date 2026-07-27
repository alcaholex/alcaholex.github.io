import ProjectsTitle from './ProjectsTitle'

const projects = [
  {
    title: '3D Portfolio Website',
    image: '/projects/portfolio-site.png',
    alt: '3D Portfolio Website',
    description: 'Portfolio built with Next.js and Tailwind CSS, featuring interactive 3D models built with Three.js.',
    tech: ['Next.js', 'Three.js', 'React'],
    note: 'This is the website!',
  },
  {
    title: 'MALFUNCTION',
    image: '/projects/malfunction.png',
    alt: 'MALFUNCTION',
    description: 'First-person shooter game developed in Unity when I was learning and experimenting with game development.',
    tech: ['Unity', 'C#', 'Blender'],
    links: [
      { label: 'Live Demo', href: 'https://store.steampowered.com/app/1899790/MALFUNCTION_FPS/' },
      { label: 'GitHub', href: 'https://github.com/alcaholex/MALFUNCTION-FPS' },
    ],
  },
  {
    title: 'Interactive Cell Biology',
    image: '/projects/cell.png',
    alt: 'Cell Project',
    description: 'Interactive visualization of the animal cell and its organelles; created for an elementary school project.',
    tech: ['Unity', 'C#', 'Blender'],
    links: [
      { label: 'Live Demo', href: 'https://hoiman6321.itch.io/cell-biology' },
      { label: 'GitHub', href: 'https://github.com/alcaholex/cell-biology' },
    ],
  },
]

export default function Projects() {
  return (
    // id/data-navbar-theme live on the SlideInSection wrapper, which stays in
    // normal flow while this content is pinned and swiping in.
    <section className="min-h-screen bg-gray-50 flex flex-col justify-start relative z-30">
      {/* The 3D word is the heading; the sr-only h1 keeps it in the document for
          assistive tech and search. It sits outside the container so its canvas
          spans the full width, which is what makes it match the hero's. */}
      <h1 className="sr-only">projects</h1>
      <ProjectsTitle />
      <div className="container mx-auto px-4 pb-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-24 h-1 bg-gray-300 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            some projects i&apos;m proud of:
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <div key={project.title} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="h-48 bg-gray-100 flex items-center justify-center p-4">
                <img
                  src={project.image}
                  alt={project.alt}
                  className="max-w-full max-h-full object-contain rounded shadow-md"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-3">{project.title}</h3>
                <p className="text-gray-600 mb-4">{project.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.tech.map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex space-x-3">
                  {project.note && (
                    <span className="text-gray-500 text-sm">{project.note}</span>
                  )}
                  {project.links?.map((link) => (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors">
                      <span className="text-sm">{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
