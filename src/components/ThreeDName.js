'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Center, OrbitControls } from '@react-three/drei'
import TitleMaterial from './TitleMaterial'
import { Suspense, useRef, useState, useEffect } from 'react'
import { Vector3, Spherical, Box3 } from 'three'
import Warmup from './Warmup'
import { useAssetReady } from './LoadingGate'
import useDeferredMount from './useDeferredMount'
import ScrollHint from './ScrollHint'
import * as sfx from './sound'

function Model({ url, onLoad, groupRef }) {
  const { scene } = useGLTF(url, true)
  const { viewport } = useThree()

  useEffect(() => {
    if (scene && onLoad) {
      onLoad()
    }
  }, [scene, onLoad])

  return (
    <group ref={groupRef}>
      <Center scale={viewport.width / 8.5}>
        {scene.children.map((child, index) => (
          <mesh
            key={index}
            geometry={child.geometry}
            scale={[2, 2, 2]}
            rotation={[Math.PI / 2, 0, 0]}
          >

            <TitleMaterial aoUrl="/ao/name-ao.png" />
          </mesh>
        ))}
      </Center>
    </group>
  )
}

// Keeps the touch overlay glued to the title's screen-space bounds. The div
// is positioned/sized outright (not clip-path'd) — WebKit's clip-path
// hit-testing is unreliable, plain element bounds are not.
function TitleHitArea({ modelRef, overlayRef }) {
  const { camera, size } = useThree()
  const box = useRef(new Box3())
  const v = useRef(new Vector3())

  useFrame(() => {
    const el = overlayRef.current
    const obj = modelRef.current
    if (!el || !obj) return

    box.current.setFromObject(obj)
    if (box.current.isEmpty()) return

    const { min, max } = box.current
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < 8; i++) {
      v.current
        .set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z)
        .project(camera)
      const sx = (v.current.x + 1) * 0.5 * size.width
      const sy = (1 - v.current.y) * 0.5 * size.height
      if (sx < minX) minX = sx
      if (sx > maxX) maxX = sx
      if (sy < minY) minY = sy
      if (sy > maxY) maxY = sy
    }

    const pad = 20
    const left = Math.max(0, minX - pad)
    const top = Math.max(0, minY - pad)
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.width = `${Math.min(size.width, maxX + pad) - left}px`
    el.style.height = `${Math.min(size.height, maxY + pad) - top}px`
  })

  return null
}

function AutoResetOrbitControls({ domElement }) {
  const controlsRef = useRef()
  const timeoutRef = useRef()
  const { gl } = useThree()
  const prevOverflow = useRef(null)
  // iOS honors preventDefault on non-passive touchmove where it ignores
  // touch-action: none (notably the top-of-page rubber-band).
  const blockTouch = useRef((e) => {
    if (e.cancelable) e.preventDefault()
  })

  const lockScroll = () => {
    if (prevOverflow.current === null) {
      prevOverflow.current = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      window.addEventListener('touchmove', blockTouch.current, { passive: false })
    }
  }
  const unlockScroll = () => {
    if (prevOverflow.current !== null) {
      document.documentElement.style.overflow = prevOverflow.current
      prevOverflow.current = null
      window.removeEventListener('touchmove', blockTouch.current)
    }
  }

  useEffect(() => {
    if (!domElement) return
    const block = blockTouch.current
    domElement.addEventListener('touchmove', block, { passive: false })
    return () => domElement.removeEventListener('touchmove', block)
  }, [domElement])
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

    // OrbitControls scales rotation by the bound element's height; when bound
    // to the title-sized overlay, rescale so the feel matches canvas binding.
    if (c && domElement) {
      const h = domElement.clientHeight
      const H = gl.domElement.clientHeight
      if (h && H) c.rotateSpeed = (2 * h) / H
    }

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

    const handlePointerDown = () => {
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
      timeoutRef.current = setTimeout(resetCamera, 1000)
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)

    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      unlockScroll()
    }
  }, [])

  return (
    <OrbitControls
      ref={controlsRef}
      domElement={domElement}
      enableZoom={false}
      enablePan={false}
      rotateSpeed={2}
      // Unlock on both edges: desktop grants audio activation on pointerdown,
      // mobile Chrome only on release — so the first touch-drag's ease-home
      // still hums. Scroll lock is overlay-path only: on desktop the vanishing
      // scrollbar would reflow the page mid-drag.
      onStart={() => {
        sfx.unlock()
        if (domElement) lockScroll()
      }}
      onEnd={() => {
        sfx.unlock()
        unlockScroll()
      }}
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

let hasDraggedBefore = false

function DragHint() {
  return (

    <div className="absolute inset-x-0 top-0 h-[100dvh] z-40 pointer-events-none flex items-end justify-center pb-48">
      <div className="flex items-center gap-2 text-gray-500 text-base font-medium animate-pulse [animation-duration:3s] dark:text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-4 5 4 5M16 7l4 5-4 5" />
        </svg>
        drag to rotate
      </div>
    </div>
  )
}

export default function ThreeDModel({ modelPath = "/models/name.glb" }) {
  const markReady = useAssetReady('name')
  const canvasMounted = useDeferredMount(0)

  const [isLoaded, setIsLoaded] = useState(false)
  const [showHint, setShowHint] = useState(!hasDraggedBefore)

  const [isActive, setIsActive] = useState(true)

  // On touch devices the controls bind to a clip-path overlay over the title
  // instead of the canvas, so swipes on empty space scroll the page.
  const [isCoarse, setIsCoarse] = useState(false)
  const [overlayEl, setOverlayEl] = useState(null)
  const overlayRef = useRef(null)
  const modelRef = useRef(null)

  const setOverlay = (el) => {
    overlayRef.current = el
    setOverlayEl(el)
  }

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setIsCoarse(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const handleModelLoad = () => {
    setIsLoaded(true)
  }

  useEffect(() => {
    if (!showHint) return

    let origin = null

    const handlePointerDown = (e) => {
      const onScene = e.target?.tagName === 'CANVAS' || e.target?.hasAttribute?.('data-title-drag')
      origin = onScene ? { x: e.clientX, y: e.clientY } : null
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

      setIsActive(scrollPosition < viewportHeight)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() 

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <div className={`absolute inset-x-0 top-0 h-screen md:h-[150vh] z-40 ${isActive ? '' : 'pointer-events-none'}`}>
        {canvasMounted && <Canvas
          camera={{ position: [0, -5, 10], fov: 50 }}
          dpr={[1, 2]}

          frameloop={isActive ? 'always' : 'never'}
        >


          <AutoResetOrbitControls domElement={overlayEl ?? undefined} />
          <LensShift />
          {overlayEl && <TitleHitArea modelRef={modelRef} overlayRef={overlayRef} />}

          <Suspense fallback={null}>
            <Model url={modelPath} onLoad={handleModelLoad} groupRef={modelRef} />
            <Warmup onReady={markReady} />
          </Suspense>
        </Canvas>}
        {isCoarse && (
          <div
            ref={setOverlay}
            data-title-drag=""
            className="absolute"
            style={{ left: 0, top: 0, width: 0, height: 0 }}
          />
        )}
      </div>
      {isActive && isLoaded && showHint && <DragHint />}
      <ScrollHint enabled={isLoaded} />
    </>
  )
}