'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Center, MeshTransmissionMaterial, Environment, OrbitControls } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect } from 'react'
import { Vector3, Spherical } from 'three'
import Warmup from './Warmup'
import { useAssetReady } from './LoadingGate'
import ScrollHint from './ScrollHint'
import ThemedEnvLight from './ThemedEnvLight'
import * as sfx from './sound'

function Model({ url }) {
  const { scene } = useGLTF(url, true)
  const { viewport } = useThree()

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
  const { gl } = useThree()
  const controlsRef = useRef()
  const timeoutRef = useRef()
  const initialSpherical = useRef(new Spherical(11.18, Math.PI / 2 + Math.asin(5/11.18), 0)) // radius, phi, theta for [0,-5,10]
  const initialTarget = useRef(new Vector3(0, 0, 0))
  const [isResetting, setIsResetting] = useState(false)
  const resetProgress = useRef(0)
  const startSpherical = useRef(new Spherical())
  const startTarget = useRef(new Vector3())
  // Last frame's camera angles, for the angular speed the whoosh follows.
  const prevAngles = useRef(null)

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
    // Sonify the word's motion the Mini Metro way: rotation is strummed.
    // Each frame hands the module its signed angular travel, and the module
    // plays one soft pentatonic step per increment — up the ladder one way,
    // down the other — for a hand-spin and the ease home alike.
    const c = controlsRef.current
    if (c && delta > 0) {
      const az = c.getAzimuthalAngle()
      const pol = c.getPolarAngle()
      if (prevAngles.current) {
        const dAz = az - prevAngles.current.az
        const d = Math.hypot(dAz, pol - prevAngles.current.pol)
        if (d > 0.0005) sfx.spin(dAz >= 0 ? d : -d)
      }
      prevAngles.current = { az, pol }
    }

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
    const canvas = gl.domElement

    // OrbitControls sets touch-action:none on the canvas. The hero can afford
    // that — it is the top of the page — but a full-screen canvas in the middle
    // of the document would swallow every vertical swipe and leave phone users
    // unable to scroll past the title. pan-y hands vertical swipes back to the
    // page while horizontal drags still spin the word.
    canvas.style.touchAction = 'pan-y'

    let dragging = false

    // Scoped to this canvas rather than the window (the hero's version): the
    // page carries three of these now, and window listeners would make a click
    // anywhere schedule a reset on all of them.
    const handlePointerDown = () => {
      dragging = true
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

    // The release can land outside the canvas, and a swipe the browser takes
    // over for scrolling only ever fires pointercancel — both end the drag.
    const handlePointerUp = () => {
      if (!dragging) return
      dragging = false
      timeoutRef.current = setTimeout(resetCamera, 1000)
    }

    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [gl])

  return (
    <OrbitControls
      ref={controlsRef}
      enableZoom={false}
      enablePan={false}
      rotateSpeed={2}
      // The grab itself is silent, but it fires inside the gesture, which is
      // what lets it unlock audio — the spin whoosh cannot do that itself.
      onStart={() => sfx.unlock()}
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

// The glass word that heads the projects section. The viewport is the hero's,
// part for part — same canvas box, camera, lens shift, controls and material —
// so the word lands at exactly the size and angle the name does. Only the model,
// and the three notes below, differ.
export default function ProjectsTitle({ modelPath = "/models/projects.glb" }) {
  const containerRef = useRef(null)
  const markReady = useAssetReady('projects')
  // The hero pauses on `scrollY < innerHeight`, which is really "is the page at
  // the top". That is never true where this sits, so it would freeze the title
  // permanently; the equivalent test here is whether the title is on screen.
  // Three transmission canvases in one document is more GPU work than a frame
  // can carry, so the loop only runs for the one being looked at. The Canvas
  // itself never unmounts, so scrolling back is instant.
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting),
      { rootMargin: '150px 0px' }
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    // Reserves exactly one screen in the flow while the canvas inside keeps the
    // hero's 150vh box — the aspect is what sets the model's scale, so trimming
    // it would shrink the word. That extra 50vh is left unclipped on purpose,
    // exactly as on the hero: layered above the sections (z-40 > z-30) on a
    // transparent canvas, the word is free to spill over the content below
    // rather than being cut off at the title's own edge.
    <div ref={containerRef} className="relative w-full h-screen shrink-0">
      <div className={`absolute inset-x-0 top-0 h-screen md:h-[150vh] z-40 ${isActive ? '' : 'pointer-events-none'}`}>
        <Canvas
          camera={{ position: [0, -5, 10], fov: 50 }}
          dpr={[1, 2]}
          // Paused (no GPU work) while scrolled away; the context and loaded
          // model stay alive so coming back resumes instantly.
          frameloop={isActive ? 'always' : 'never'}
          performance={{ min: 0.8 }}
        >
          {/* frames={Infinity} because the light sphere fades with the
              theme, and a one-shot bake would never see it change. */}
          <Environment frames={Infinity}>
            <ThemedEnvLight />
          </Environment>

          <AutoResetOrbitControls />
          <LensShift />

          <Suspense fallback={null}>
            <Model url={modelPath} />
            <Warmup onReady={markReady} />
          </Suspense>
        </Canvas>
      </div>
      {/* After the canvas so it layers above it at the same z-40. */}
      <ScrollHint />
    </div>
  )
}

// Start the download on import rather than waiting for the canvas to be
// measured and mounted.
useGLTF.preload('/models/projects.glb')
