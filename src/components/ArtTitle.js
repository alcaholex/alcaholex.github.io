'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Center, OrbitControls } from '@react-three/drei'
import TitleMaterial from './TitleMaterial'
import { Suspense, useRef, useState, useEffect } from 'react'
import { Vector3, Spherical } from 'three'
import Warmup from './Warmup'
import { useAssetReady } from './LoadingGate'
import useDeferredMount from './useDeferredMount'
import ScrollHint from './ScrollHint'
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

          <TitleMaterial aoUrl="/ao/art-ao.png" />
        </mesh>
      ))}
    </Center>
  )
}

function AutoResetOrbitControls() {
  const { gl } = useThree()
  const controlsRef = useRef()
  const timeoutRef = useRef()
  const initialSpherical = useRef(new Spherical(11.18, Math.PI / 2 + Math.asin(5/11.18), 0))
  const initialTarget = useRef(new Vector3(0, 0, 0))
  const [isResetting, setIsResetting] = useState(false)
  const resetProgress = useRef(0)
  const startSpherical = useRef(new Spherical())
  const startTarget = useRef(new Vector3())

  const prevAngles = useRef(null)

  const easeInOutCubic = (t) => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  const resetCamera = () => {
    if (controlsRef.current) {
      if (controlsRef.current.object) {
        controlsRef.current.object.rotation.set(0, 0, 0)
      }

      controlsRef.current.dampingFactor = 1
      controlsRef.current.enableDamping = false

      const currentPos = controlsRef.current.object.position.clone()
      currentPos.sub(controlsRef.current.target)
      startSpherical.current.setFromVector3(currentPos)
      startTarget.current.copy(controlsRef.current.target)
    }
    setIsResetting(true)
    resetProgress.current = 0
  }

  useFrame((state, delta) => {
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
      resetProgress.current += delta * 5

      if (resetProgress.current >= 1) {
        const finalPos = new Vector3().setFromSpherical(initialSpherical.current)
        finalPos.add(initialTarget.current)
        controlsRef.current.object.position.copy(finalPos)
        controlsRef.current.target.copy(initialTarget.current)
        controlsRef.current.update()

        controlsRef.current.enableDamping = true
        controlsRef.current.dampingFactor = 0.05

        setIsResetting(false)
        return
      }

      const easedProgress = easeInOutCubic(resetProgress.current)

      const currentSpherical = new Spherical(
        startSpherical.current.radius + (initialSpherical.current.radius - startSpherical.current.radius) * easedProgress,
        startSpherical.current.phi + (initialSpherical.current.phi - startSpherical.current.phi) * easedProgress,
        startSpherical.current.theta + (initialSpherical.current.theta - startSpherical.current.theta) * easedProgress
      )

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

    canvas.style.touchAction = 'pan-y'

    let dragging = false

    const handlePointerDown = () => {
      dragging = true
      setIsResetting(false)
      if (controlsRef.current) {
        controlsRef.current.enableDamping = true
        controlsRef.current.dampingFactor = 0.05
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }

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
      // Unlock on both edges: desktop grants audio activation on pointerdown,
      // mobile Chrome only on release — so the first touch-drag's ease-home
      // still hums.
      onStart={() => sfx.unlock()}
      onEnd={() => sfx.unlock()}
    />
  )
}

function LensShift() {
  const { camera, size } = useThree()

  useFrame(() => {
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : size.height
    camera.projectionMatrix.elements[9] = screenHeight / size.height - 1
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  })

  return null
}

export default function ArtTitle({ modelPath = "/models/art.glb" }) {
  const containerRef = useRef(null)
  const markReady = useAssetReady('art')
  const canvasMounted = useDeferredMount(500)

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
    <div ref={containerRef} className="relative w-full h-screen shrink-0">
      <div className={`absolute inset-x-0 top-0 h-screen md:h-[150vh] z-40 ${isActive ? '' : 'pointer-events-none'}`}>
        {canvasMounted && <Canvas
          camera={{ position: [0, -5, 10], fov: 50 }}
          dpr={[1, 2]}

          frameloop={isActive ? 'always' : 'never'}
        >


          <AutoResetOrbitControls />
          <LensShift />

          <Suspense fallback={null}>
            <Model url={modelPath} />
            <Warmup onReady={markReady} />
          </Suspense>
        </Canvas>}
      </div>

      <ScrollHint />
    </div>
  )
}
