import ThreeDModel from '../components/ThreeDName'

export default function Home() {
  return (
    <main>
      <ThreeDModel />
      <section className="min-h-screen flex items-end justify-center relative z-30 pointer-events-none" data-navbar-theme="light">
        <div className="container mx-auto px-4 py-32 relative pointer-events-none">
          <h1 className="text-4xl font-bold text-center text-gray-900">
            welcome to my portfolio
          </h1>
        </div>
      </section>
      <section className="min-h-screen bg-gray-900 flex items-center justify-center relative z-30" data-navbar-theme="dark">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-center text-white">
            
          </h1>
          <p className="text-center text-gray-300 mt-4">
            
          </p>
        </div>
      </section>
      <section className="min-h-screen bg-blue-50 flex items-center justify-center relative z-30" data-navbar-theme="light">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-center text-blue-900">
            
          </h1>
          <p className="text-center text-blue-600 mt-4">
            
          </p>
        </div>
      </section>
    </main>
  )
}