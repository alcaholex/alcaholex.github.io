'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Center, MeshTransmissionMaterial, Environment, OrbitControls } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect } from 'react'
import { Raycaster, Vector2, Vector3, Euler, Spherical } from 'three'

function Model({ url }) {
  const { scene } = useGLTF(url)
  const { viewport, camera } = useThree()
  const [mouse, setMouse] = useState(new Vector2())
  const meshRefs = useRef([])
  const materialRefs = useRef([])
  const raycaster = useRef(new Raycaster())
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouse(new Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      ))
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  useFrame(() => {
    raycaster.current.setFromCamera(mouse, camera)
    const intersects = raycaster.current.intersectObjects(meshRefs.current.filter(Boolean))
    
    materialRefs.current.forEach((material, index) => {
      if (material) {
        const isHovered = intersects.some(intersect => intersect.object === meshRefs.current[index])
      }
    })
  })

  return (
    <Center scale={viewport.width / 8.5}>
      {scene.children.map((child, index) => (
        <mesh 
          key={index} 
          ref={el => meshRefs.current[index] = el}
          geometry={child.geometry} 
          scale={[2, 2, 2]} 
          rotation={[Math.PI / 2, 0, 0]}
        >
          <MeshTransmissionMaterial 
            ref={el => materialRefs.current[index] = el}
            distortion={0.2}
            thickness={0.5}
            roughness={0}
            transmission={0.7}
            ior={1.5}
            chromaticAberration={0.05}
            backside={true}
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

  const handleInteraction = () => {
    setIsResetting(false) // Stop any ongoing reset animation
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(resetCamera, 1000)
  }

  useEffect(() => {
    const handleMouseDown = () => {
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

    const handleMouseUp = () => {
      timeoutRef.current = setTimeout(resetCamera, 1000)
    }

    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
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

export default function ThreeDModel({ modelPath = "/portfolio-site/models/name.glb" }) {
  return (
    <div className="fixed inset-0 z-20" style={{ top: '-200px' }}>
      <Canvas
        camera={{ position: [0, -5, 10], fov: 50 }}
        style={{ background: 'white' }}
      >
        <Environment>
          <mesh>
            <sphereGeometry args={[50, 32, 32]} />
            <meshBasicMaterial color="#ffffff" side={2} />
          </mesh>
        </Environment>
        
        <AutoResetOrbitControls />
        
        <Suspense fallback={null}>
          <Model url={modelPath} />
        </Suspense>
      </Canvas>
    </div>
  )
}