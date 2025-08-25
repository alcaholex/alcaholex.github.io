import ThreeDModel from '../components/ThreeDName'

export default function Home() {
  return (
    <main>
      <ThreeDModel />
      <section id="section-1" className="h-[80vh] flex items-end justify-center relative z-30 pointer-events-none" data-navbar-theme="light">
      </section>
      <section id="section-2" className="min-h-screen bg-gray-50 flex items-center justify-center relative z-30" data-navbar-theme="light">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          <div className="grid lg:grid-cols-3 gap-16 items-start">
            {/* Left Column - Title & Profile */}
            <div className="lg:col-span-1 flex flex-col items-center lg:items-start space-y-8">
              {/* Title */}
              <div>
                <h1 className="text-4xl font-medium text-gray-900 mb-4">
                  hello, i&apos;m <span className="font-bold">alex</span>
                </h1>
                <div className="w-24 h-1 bg-gray-300"></div>
              </div>

              {/* Profile Photo */}
              <div className="flex justify-center">
                <div className="w-64 h-64 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-gray-500 text-sm">pfp</span>
                </div>
              </div>


              {/* Social Links */}
              <div className="flex justify-center space-x-4">
                <a href="https://github.com/alcaholex" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="https://www.instagram.com/alcaholex" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 0C7.284 0 6.944.012 5.877.06 4.814.108 4.086.277 3.45.525a5.936 5.936 0 00-2.14 1.39A5.936 5.936 0 00.525 3.45C.277 4.086.108 4.814.06 5.877.012 6.944 0 7.284 0 10s.012 3.056.06 4.123c.048 1.063.217 1.791.465 2.427a5.936 5.936 0 001.39 2.14 5.936 5.936 0 002.14 1.39c.636.248 1.364.417 2.427.465C6.944 19.988 7.284 20 10 20s3.056-.012 4.123-.06c1.063-.048 1.791-.217 2.427-.465a5.936 5.936 0 002.14-1.39 5.936 5.936 0 001.39-2.14c.248-.636.417-1.364.465-2.427C19.988 13.056 20 12.716 20 10s-.012-3.056-.60-4.123c-.048-1.063-.217-1.791-.465-2.427a5.936 5.936 0 00-1.39-2.14A5.936 5.936 0 0015.55.525C14.914.277 14.186.108 13.123.06 12.056.012 11.716 0 10 0zm0 1.802c2.67 0 2.987.01 4.042.059.976.045 1.505.207 1.858.344.467.182.8.398 1.15.748.35.35.566.683.748 1.15.137.353.3.882.344 1.858.048 1.055.058 1.37.058 4.039 0 2.67-.01 2.984-.058 4.04-.045.976-.207 1.505-.344 1.858a3.097 3.097 0 01-.748 1.15c-.35.35-.683.566-1.15.748-.353.137-.882.3-1.858.344-1.055.048-1.37.058-4.04.058-2.67 0-2.984-.01-4.04-.058-.976-.045-1.505-.207-1.858-.344a3.097 3.097 0 01-1.15-.748 3.097 3.097 0 01-.748-1.15c-.137-.353-.3-.882-.344-1.858C1.812 12.984 1.802 12.67 1.802 10c0-2.67.01-2.987.058-4.042.045-.976.207-1.505.344-1.858.182-.467.398-.8.748-1.15.35-.35.683-.566 1.15-.748.353-.137.882-.3 1.858-.344C7.016 1.812 7.33 1.802 10 1.802zM10 5.378a4.622 4.622 0 100 9.244 4.622 4.622 0 000-9.244zM10 13a3 3 0 110-6 3 3 0 010 6zm5.884-7.804a1.08 1.08 0 11-2.16 0 1.08 1.08 0 012.16 0z" clipRule="evenodd"></path>
                  </svg>
                </a>
                <a href="https://www.linkedin.com/in/alex-li-092b14378/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd"></path>
                  </svg>
                </a>
              </div>
            </div>

            {/* Right Column - Content */}
            <div className="lg:col-span-2 space-y-8 mt-16">
              {/* Intro */}
              <div>
                <p className="text-gray-800 text-xl leading-relaxed mb-6">
                  I am an 11th grade IB student with a passion for design, technology, and engineering.
                </p>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Despite my already wide variety of skills and interests, I am always eager to learn and take on new challenges!
                </p>
              </div>

              {/* Current Status */}
              <div>
                <h3 className="text-gray-900 font-medium text-lg mb-3">Currently</h3>
                <p className="text-gray-600">Chasing that 45/45 IB score...</p>
              </div>

              {/* Skills */}
              <div>
                <h3 className="text-gray-900 font-medium text-lg mb-4">Skills & Technologies</h3>
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
      <section id="section-3" className="min-h-screen bg-gray-50 flex items-center justify-center relative z-30" data-navbar-theme="light">
        <div className="container mx-auto px-4 py-16 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-medium text-gray-900 mb-4">
              projects
            </h1>
            <div className="w-24 h-1 bg-gray-300 mx-auto mb-6"></div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Some projects I&apos;m proud of:
            </p>
          </div>

          {/* Projects Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Project 1 */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="h-48 bg-gray-100 flex items-center justify-center p-4">
                <img 
                  src="/projects/portfolio-site.png" 
                  alt="3D Portfolio Website" 
                  className="max-w-full max-h-full object-contain rounded shadow-md"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-3">3D Portfolio Website</h3>
                <p className="text-gray-600 mb-4">Portfolio built with Next.js and Tailwind CSS, featuring interactive 3D models built with Three.js.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Next.js', 'Three.js', 'React'].map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <span className="text-gray-500 text-sm">This is the website!</span>
                </div>
              </div>
            </div>

            {/* Project 2 */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="h-48 bg-gray-100 flex items-center justify-center p-4">
                <img 
                  src="/projects/malfunction.png" 
                  alt="3D Portfolio Website" 
                  className="max-w-full max-h-full object-contain rounded shadow-md"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-3">MALFUNCTION</h3>
                <p className="text-gray-600 mb-4">First-person shooter game developed in Unity when I was learning and experimenting with game development.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['Unity', 'C#', 'Blender'].map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <a href="https://store.steampowered.com/app/1899790/MALFUNCTION_FPS/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors">
                    <span className="text-sm">Live Demo</span>
                  </a>
                  <a href="https://github.com/alcaholex/MALFUNCTION-FPS" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 transition-colors">
                    <span className="text-sm">GitHub</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Project 3 */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
              <div className="h-48 bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">screenshot</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-3">yap yap yap</h3>
                <p className="text-gray-600 mb-4">yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap yap </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['yap', 'yap1', 'yap2'].map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex space-x-3">
                  <a href="#" className="text-gray-500 hover:text-gray-700 transition-colors">
                    <span className="text-sm">Live Demo</span>
                  </a>
                  <a href="#" className="text-gray-500 hover:text-gray-700 transition-colors">
                    <span className="text-sm">GitHub</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}