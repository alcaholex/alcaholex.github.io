'use client'

import ThreeDModel from '../components/ThreeDName'
import { GithubIcon, InstagramIcon, LinkedInIcon } from '../components/Icons'

export default function Home() {
  return (
    <main>
      <ThreeDModel />
      <section id="section-1" className="h-screen flex items-end justify-center relative z-30 pointer-events-none" data-navbar-theme="light">
      </section>
      <section id="section-2" className="min-h-screen bg-gray-50 flex items-start justify-center relative z-30" data-navbar-theme="light">
        <div className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-16 items-start">
            {/* Left Column - Title & Profile */}
            <div className="lg:col-span-1 flex flex-col items-center lg:items-start space-y-8">
              {/* Title */}
              <div>
                <h1 className="text-4xl font-medium text-gray-900 mb-4">
                  hello, i&apos;m <span className="font-bold">alex</span>
                </h1>
                <div className="w-24 h-1 bg-gray-300 mx-auto lg:mx-0"></div>
              </div>

              {/* Profile Photo */}
              <div className="flex justify-center">
                <div className="w-64 h-64 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full overflow-hidden shadow-lg">
                  <img
                    src="/pfp.jpg"
                    alt="Alex Li Profile Picture"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>


              {/* Social Links */}
              <div className="flex justify-center space-x-4">
                <a href="https://github.com/alcaholex" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200">
                  <GithubIcon />
                </a>
                <a href="https://www.instagram.com/alcaholex" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200">
                  <InstagramIcon />
                </a>
                <a href="https://www.linkedin.com/in/alex-li-092b14378/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200">
                  <LinkedInIcon />
                </a>
              </div>
            </div>

            {/* Right Column - Content */}
            <div className="lg:col-span-2 space-y-8 mt-16">
              {/* Intro */}
              <div>
                <p className="text-gray-800 text-xl leading-relaxed mb-6">
                  i&apos;m a high school student with a passion for design, technology, and engineering.
                </p>
                <p className="text-gray-600 text-lg leading-relaxed">
                  despite my already wide variety of skills and interests, i am always eager to learn and take on new challenges!
                </p>
              </div>

              {/* Current Status */}
              <div>
                <h3 className="text-gray-900 font-medium text-lg mb-3">currently:</h3>
                <p className="text-gray-600">in a cave with a box of scraps</p>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-gray-900 font-medium text-lg mb-4">skills & technologies:</h3>
                <div className="flex flex-wrap gap-3">
                  {['Blender', 'Unity', 'Fusion 360', 'DaVinci Resolve', 'C#', 'C++', 'Java', 'Python', '.NET', 'HTML5', 'React.js', 'Next.js', 'Three.js'].map((skill) => (
                    <span key={skill} className="px-4 py-2 bg-black/5 backdrop-blur-xl border border-black/15 text-gray-800 text-sm rounded-full hover:bg-black/8 hover:border-black/20 transition-all duration-300 shadow-lg">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
