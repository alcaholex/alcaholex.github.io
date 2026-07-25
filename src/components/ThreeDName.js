'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Center, MeshTransmissionMaterial, Environment, OrbitControls } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect } from 'react'
import { Vector3, Spherical } from 'three'

function Model({ url, onLoad }) {
  const { scene } = useGLTF(url, true)
  const { viewport } = useThree()

  useEffect(() => {
    if (scene && onLoad) {
      onLoad()
    }
  }, [scene, onLoad])

  return (
    <Center scale={viewport.width / 8.5}>
      {scene.children.map((child, index) => (
        <mesh
          key={index}
          geometry={child.geometry}
          scale={[2, 2, 2]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          {/* drei's defaults: resolution undefined means the transmission FBO
              matches the full drawing buffer, and samples defaults to 10. */}
          <MeshTransmissionMaterial
            backside={true}
            distortion={0.2}
            thickness={0.5}
            roughness={0}
            transmission={0.7}
            ior={1.5}
            chromaticAberration={0.05}
            transparent={true}
          />
        </mesh>
      ))}
    </Center>
  )
}

function AutoResetOrbitControls() {
  const controlsRef = useRef()
  const timeoutRef = useRef()
  const initialSpherical = useRef(new Spherical(11.18, Math.PI / 2 + Math.asin(5/11.18), 0)) // radius, phi, theta for [0,-5,10]
  const initialTarget = useRef(new Vector3(0, 0, 0))
  const [isResetting, setIsResetting] = useState(false)
  const resetProgress = useRef(0)
  const startSpherical = useRef(new Spherical())
  const startTarget = useRef(new Vector3())

  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const resetCamera = () => {
    if (controlsRef.current) {
      // Stop any ongoing momentum/velocity by resetting internal state
      if (controlsRef.current.object) {
        controlsRef.current.object.rotation.set(0, 0, 0)
      }
      
      // Reset OrbitControls internal velocity properties
      controlsRef.current.dampingFactor = 1
      controlsRef.current.enableDamping = false
      
      // Get current spherical coordinates
      const currentPos = controlsRef.current.object.position.clone()
      currentPos.sub(controlsRef.current.target)
      startSpherical.current.setFromVector3(currentPos)
      startTarget.current.copy(controlsRef.current.target)
    }
    setIsResetting(true)
    resetProgress.current = 0
  }

  useFrame((state, delta) => {
    if (isResetting && controlsRef.current) {
      resetProgress.current += delta * 5 // Speed of animation
      
      if (resetProgress.current >= 1) {
        // Final position set and stop lerping
        const finalPos = new Vector3().setFromSpherical(initialSpherical.current)
        finalPos.add(initialTarget.current)
        controlsRef.current.object.position.copy(finalPos)
        controlsRef.current.target.copy(initialTarget.current)
        controlsRef.current.update()
        
        // Re-enable damping
        controlsRef.current.enableDamping = true
        controlsRef.current.dampingFactor = 0.05
        
        setIsResetting(false)
        return
      }
      
      // Apply easing to the progress
      const easedProgress = easeInOutCubic(resetProgress.current)
      
      // Lerp spherical coordinates with eased progress
      const currentSpherical = new Spherical(
        startSpherical.current.radius + (initialSpherical.current.radius - startSpherical.current.radius) * easedProgress,
        startSpherical.current.phi + (initialSpherical.current.phi - startSpherical.current.phi) * easedProgress,
        startSpherical.current.theta + (initialSpherical.current.theta - startSpherical.current.theta) * easedProgress
      )
      
      // Convert back to position
      const newPos = new Vector3().setFromSpherical(currentSpherical)
      const newTarget = new Vector3().lerpVectors(startTarget.current, initialTarget.current, easedProgress)
      newPos.add(newTarget)
      
      controlsRef.current.object.position.copy(newPos)
      controlsRef.current.target.copy(newTarget)
      controlsRef.current.update()
    }
  })

  useEffect(() => {
    // Pointer events cover mouse, touch and pen; plain mouse events never fire
    // on touchscreens, so the snap-back timer was never scheduled on phones.
    const handlePointerDown = () => {
      setIsResetting(false) // Stop any ongoing reset animation
      if (controlsRef.current) {
        // Re-enable damping if it was disabled
        controlsRef.current.enableDamping = true
        controlsRef.current.dampingFactor = 0.05
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

    const handlePointerUp = () => {
      timeoutRef.current = setTimeout(resetCamera, 1000)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    // A cancelled touch (scroll takeover, gesture) fires no pointerup; treat it
    // the same so the camera still returns home.
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
    />
  )
}

// The canvas is taller than one screen (so the name can render over section 2),
// which puts its centre — and the OrbitControls pivot at world origin — below the
// fold. This applies a vertical lens shift so origin renders in the first
// viewport instead. It is a depth-independent shear (elements[9]): a uniform image
// translation, so the model still rotates about its own centre and the pivot does
// not move. Re-applied each frame because OrbitControls/resize rebuild the matrix.
function LensShift() {
  const { camera, size } = useThree()

  useFrame(() => {
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : size.height
    camera.projectionMatrix.elements[9] = screenHeight / size.height - 1
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  })

  return null
}

function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-30 bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">loading...</p>
      </div>
    </div>
  )
}

// Module-scoped so the hint stays dismissed across the unmount/remount that
// scrolling past the hero triggers. Resets on a full page load, which is fine.
let hasDraggedBefore = false

function DragHint() {
  return (
    <div className="absolute inset-x-0 top-0 h-screen z-40 pointer-events-none flex items-end justify-center pb-16">
      <div className="flex items-center gap-2 text-gray-500 text-base font-medium animate-pulse [animation-duration:3s]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
        </svg>
        drag to rotate
      </div>
    </div>
  )
}

export default function ThreeDModel({ modelPath = "/models/name.glb" }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [showHint, setShowHint] = useState(!hasDraggedBefore)
  // The Canvas stays mounted for the whole page; this only toggles whether its
  // render loop runs. Scrolling past the hero pauses it (no GPU work) instead of
  // tearing down the WebGL context, so scrolling back is instant with no reload.
  const [isActive, setIsActive] = useState(true)

  const handleModelLoad = () => {
    setIsLoaded(true)
  }

  // Dismiss the hint only on a real drag on the canvas — a plain click or a
  // drag that starts elsewhere on the page does not count as "rotating".
  useEffect(() => {
    if (!showHint) return

    let origin = null

    const handlePointerDown = (e) => {
      origin = e.target?.tagName === 'CANVAS' ? { x: e.clientX, y: e.clientY } : null
    }
    const handlePointerMove = (e) => {
      if (!origin) return
      if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 12) {
        hasDraggedBefore = true
        setShowHint(false)
      }
    }
    const handlePointerUp = () => {
      origin = null
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [showHint])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const viewportHeight = window.innerHeight

      // The name scrolls with the page. Pause the render loop once it has scrolled
      // off (~one screen); resume when it comes back. Never unmounts, so scrolling
      // back is instant.
      setIsActive(scrollPosition < viewportHeight)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Check initial position

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {!isLoaded && <LoadingScreen />}
      {/* Taller than one screen and layered ABOVE the sections (z-40 > z-30) with a
          transparent background, so the name renders over section 2 as it rises.
          Scrolls with the page. LensShift keeps the name in the first viewport with
          the pivot on the model. Pointer events only while the name is up top, so
          the sections stay interactive once it has scrolled away. */}
      <div className={`absolute inset-x-0 top-0 h-[150vh] z-40 ${isActive ? '' : 'pointer-events-none'}`}>
        <Canvas
          camera={{ position: [0, -5, 10], fov: 50 }}
          dpr={[1, 2]}
          // Paused (no GPU work) while scrolled out of the hero; the context and
          // loaded model stay alive so scrolling back resumes instantly.
          frameloop={isActive ? 'always' : 'never'}
          performance={{ min: 0.8 }}
        >
          <Environment>
            <mesh>
              <sphereGeometry args={[50, 32, 32]} />
              <meshBasicMaterial color="#ffffff" side={2} />
            </mesh>
          </Environment>
          
          <AutoResetOrbitControls />
          <LensShift />

          <Suspense fallback={null}>
            <Model url={modelPath} onLoad={handleModelLoad} />
          </Suspense>
        </Canvas>
      </div>
      {isActive && isLoaded && showHint && <DragHint />}
    </>
  )
}