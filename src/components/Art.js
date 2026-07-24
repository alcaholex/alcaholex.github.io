import { InstagramIcon } from './Icons'

const artworks = [
  {
    title: "Agamemnon's Helmet",
    image: '/portfolio-site/art/agamemnon.png',
    alt: "Agamemnon's Helmet",
    description: (
      <>Renders of ancient Greek king Agamemnon&apos;s helmet. A love letter to Christopher Nolan&apos;s <i>Odyssey</i>.</>
    ),
    href: 'https://www.instagram.com/p/DbH1_5Qlq1d/',
  },
  {
    title: 'Space Megastructure',
    image: '/portfolio-site/art/megastructure.png',
    alt: 'Space Megastructure',
    description: 'An arbitrarily large space structure',
    href: 'https://www.instagram.com/p/Da39u8YoKcb/',
  },
  {
    title: 'Robot Renders',
    image: '/portfolio-site/art/2053x.png',
    alt: 'Robot Renders',
    description: 'A collection of VEX robot renders. Includes a climbing animation',
    href: 'https://www.instagram.com/p/DYdmqFslvsi/',
  },
  {
    title: 'Water Shader',
    image: '/portfolio-site/art/ships.png',
    alt: 'Water Shader',
    description: 'A semi-stylized demonstration of a water shader, rendered alongside ships',
    href: 'https://www.instagram.com/p/DQ3AFVfDYtu/',
    imageClassName: 'object-[center_100%]',
  },
  {
    title: 'LEGO Water',
    image: '/portfolio-site/art/legowater.png',
    alt: 'LEGO Water',
    description: 'A fun LEGO-like fluid simulation',
    href: 'https://www.instagram.com/p/DNmvmOXAffC/',
  },
  {
    title: 'Portal',
    image: '/portfolio-site/art/portal.png',
    alt: 'Portal',
    description: 'A VFX shot of a portal in a dark environment, inspired by Doctor Strange',
    href: 'https://www.instagram.com/p/DLfQNJfAJ7Q/',
  },
  {
    title: 'Cyberpunk City',
    image: '/portfolio-site/art/cyberpunk.png',
    alt: 'Cyberpunk City',
    description: 'A gloomy cyberpunk-inspired scene densely packed with dark alleys and neon lights',
    href: 'https://www.instagram.com/p/DJqQghhgFq3/',
  },
  {
    title: 'Planets',
    image: '/portfolio-site/art/earth_render.png',
    alt: 'Planets',
    description: 'A series of planet renders from our very own solar system',
    href: 'https://www.instagram.com/p/C5kCDTDA8-W/',
    navbarTheme: 'dark',
  },
  {
    title: 'Mountainous Landscape',
    image: '/portfolio-site/art/mountains.png',
    alt: 'Mountainous Landscape',
    description: 'A snowy, semi-realistic mountainous landscape created in Gaea and Blender',
    href: 'https://www.instagram.com/p/C2782vvA2rb/',
  },
]

export default function Art() {
  return (
    <section id="section-4" className="min-h-screen bg-gray-50 flex flex-col justify-start relative z-30" data-navbar-theme="light">
      <div className="container mx-auto px-4 pt-16 pb-16 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-medium text-gray-900 mb-4">
            art
          </h1>
          <div className="w-24 h-1 bg-gray-300 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            some artwork i&apos;ve created:
          </p>
        </div>

        {/* Art Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {artworks.map((art) => (
            <div key={art.title} data-navbar-theme={art.navbarTheme ?? 'light'} className="min-h-[400px] flex items-center">
              <div className="group relative w-full">
                <div className="bg-transparent rounded-xl overflow-hidden shadow-sm transition-all duration-300">
                  <div className="relative aspect-[9/16] bg-gray-100">
                    <img
                      src={art.image}
                      alt={art.alt}
                      className={`absolute inset-0 w-full h-full object-cover${art.imageClassName ? ` ${art.imageClassName}` : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white text-lg font-medium mb-1 drop-shadow-lg">{art.title}</h3>
                      <p className="text-white/80 text-sm drop-shadow-lg">{art.description}</p>
                    </div>
                    <a href={art.href} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm rounded-full p-2 hover:bg-black/40 transition-all duration-200">
                      <InstagramIcon className="w-5 h-5 text-white" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
