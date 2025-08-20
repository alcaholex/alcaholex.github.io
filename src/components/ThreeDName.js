'use client'

import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Center, MeshTransmissionMaterial, Environment, OrbitControls } from '@react-three/drei'
import { Suspense, useRef, useState, useEffect } from 'react'
import { Raycaster, Vector2 } from 'three'

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


export default function ThreeDModel({ modelPath = "/models/name.glb" }) {
  return (
    <div className="fixed inset-0 z-20">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ background: 'white' }}
      >
        <Environment>
          <mesh>
            <sphereGeometry args={[50, 32, 32]} />
            <meshBasicMaterial color="#ffffff" side={2} />
          </mesh>
        </Environment>
        
        <OrbitControls enableZoom={false} enablePan={false} />
        
        <Suspense fallback={null}>
          <Model url={modelPath} />
        </Suspense>
      </Canvas>
    </div>
  )
}