import { useMemo, useRef } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import './BattleField3D.css'

export type BattleField3DCameraMode = 'commandView' | 'actionView'

type BattleField3DProps = {
  cameraMode: BattleField3DCameraMode
}

type CameraPreset = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

const CAMERA_PRESETS: Record<BattleField3DCameraMode, CameraPreset> = {
  commandView: {
    position: [-5, 3, 12],
    target: [1, -1, -0.75],
    fov: 40,
  },
  actionView: {
    position: [-4, 3, 12],
    target: [1, -1.2, -1.5],
    fov: 34,
  },
}

function CameraRig({ cameraMode }: BattleField3DProps) {
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const lookAtTarget = useMemo(() => new THREE.Vector3(), [])

  useFrame((_, delta) => {
    const camera = cameraRef.current

    if (!camera) {
      return
    }

    const preset = CAMERA_PRESETS[cameraMode]
    const targetPosition = new THREE.Vector3(...preset.position)
    const targetLookAt = new THREE.Vector3(...preset.target)
    const speed = 1 - Math.pow(0.001, delta)

    camera.position.lerp(targetPosition, speed)
    lookAtTarget.lerp(targetLookAt, speed)
    camera.lookAt(lookAtTarget)

    camera.fov = THREE.MathUtils.lerp(camera.fov, preset.fov, speed)
    camera.updateProjectionMatrix()
  })

  return (
    <PerspectiveCamera
      makeDefault
      ref={cameraRef}
      position={CAMERA_PRESETS.commandView.position}
      fov={CAMERA_PRESETS.commandView.fov}
    />
  )
}

type TerrainPatch = {
  color: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}

function Ground() {
  const grassPatches = useMemo<TerrainPatch[]>(
    () =>
      Array.from({ length: 70 }, (_, index) => {
        const row = Math.floor(index / 10)
        const column = index % 10
        const x = -8.5 + column * 1.9 + Math.sin(index * 1.7) * 0.55
        const z = -18 + row * 3.8 + Math.cos(index * 2.1) * 0.65
        const radius = 0.8 + ((index * 13) % 7) * 0.09
        const color = index % 3 === 0 ? '#617d45' : index % 3 === 1 ? '#71894e' : '#536f3d'

        return {
          color,
          position: [x, 0.018, z],
          rotation: [-Math.PI / 2, 0, index * 0.48],
          scale: [radius * 1.4, radius * 0.58, 1],
        }
      }),
    [],
  )

  const pathSegments = useMemo(
    () => [
      { position: [0.6, 0.028, 7.5] as [number, number, number], width: 6.8, length: 4.8, rotation: -0.12 },
      { position: [0.05, 0.032, 3.6] as [number, number, number], width: 6.2, length: 4.9, rotation: -0.04 },
      { position: [-0.35, 0.036, -0.5] as [number, number, number], width: 5.2, length: 4.8, rotation: 0.08 },
      { position: [-0.8, 0.04, -4.5] as [number, number, number], width: 4.15, length: 4.7, rotation: 0.18 },
      { position: [-1.05, 0.044, -8.5] as [number, number, number], width: 3.05, length: 4.5, rotation: 0.1 },
      { position: [-1.25, 0.048, -12.2] as [number, number, number], width: 2.2, length: 4.2, rotation: -0.02 },
    ],
    [],
  )

  return (
    <group>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]}>
        <planeGeometry args={[36, 42, 1, 1]} />
        <meshStandardMaterial color="#5f7b45" roughness={0.96} />
      </mesh>

      {grassPatches.map((patch, index) => (
        <mesh
          key={index}
          position={patch.position}
          rotation={patch.rotation}
          scale={patch.scale}
          receiveShadow
        >
          <circleGeometry args={[1, 7]} />
          <meshStandardMaterial color={patch.color} roughness={1} />
        </mesh>
      ))}

      {pathSegments.map((segment, index) => (
        <mesh
          key={index}
          position={segment.position}
          rotation={[-Math.PI / 2, 0, segment.rotation]}
          receiveShadow
        >
          <planeGeometry args={[segment.width, segment.length, 1, 1]} />
          <meshStandardMaterial color={index % 2 === 0 ? '#8b7759' : '#796a50'} roughness={0.98} />
        </mesh>
      ))}

      {pathSegments.map((segment, index) => (
        <mesh
          key={'soft-edge-' + index}
          position={[segment.position[0] - 0.25, segment.position[1] + 0.004, segment.position[2]]}
          rotation={[-Math.PI / 2, 0, segment.rotation + 0.05]}
          receiveShadow
        >
          <planeGeometry args={[segment.width + 0.9, segment.length + 0.7, 1, 1]} />
          <meshStandardMaterial color="#66764a" transparent opacity={0.34} roughness={1} />
        </mesh>
      ))}
    </group>
  )
}

type TreeProps = {
  position: [number, number, number]
  scale?: number
}

function ConiferTree({ position, scale = 1 }: TreeProps) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.3, 7]} />
        <meshStandardMaterial color="#4a321f" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.35, 0]}>
        <coneGeometry args={[0.78, 1.15, 8]} />
        <meshStandardMaterial color="#1e4a2d" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, 1.9, 0]}>
        <coneGeometry args={[0.62, 1.05, 8]} />
        <meshStandardMaterial color="#245735" roughness={0.88} />
      </mesh>
      <mesh castShadow position={[0, 2.42, 0]}>
        <coneGeometry args={[0.45, 0.88, 8]} />
        <meshStandardMaterial color="#2d6440" roughness={0.88} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.22, 0.01, 0.18]}>
        <circleGeometry args={[0.62, 16]} />
        <meshBasicMaterial color="#20311f" transparent opacity={0.22} />
      </mesh>
    </group>
  )
}

function Trees() {
  const treePositions: TreeProps[] = [
    { position: [-8.6, 0, 2.4], scale: 1.52 },
    { position: [8.3, 0, 1.2], scale: 1.35 },
    { position: [-7.1, 0, -6.5], scale: 1.04 },
    { position: [6.9, 0, -5.4], scale: 1.16 },
    { position: [-4.4, 0, -10.9], scale: 0.88 },
    { position: [3.2, 0, -11.6], scale: 0.82 },
    { position: [8.8, 0, -12.8], scale: 1.05 },
    { position: [-10.4, 0, -13.8], scale: 0.92 },
  ]

  return (
    <group>
      {treePositions.map((tree, index) => (
        <ConiferTree key={index} position={tree.position} scale={tree.scale} />
      ))}
    </group>
  )
}

function Mountains() {
  const mountainColors = ['#6f8180', '#788a84', '#617576', '#82918a']

  return (
    <group position={[0, -0.35, -24]}>
      {[-12, -7, -2, 3.6, 8.8, 13].map((x, index) => (
        <mesh
          key={index}
          position={[x, 2.2 + (index % 2) * 0.25, -index * 0.7]}
          rotation={[0, 0.45 + index * 0.15, 0]}
          scale={[3.8 + (index % 3) * 0.8, 2.6 + (index % 2) * 0.6, 3.8]}
        >
          <coneGeometry args={[1.3, 2.8, 5]} />
          <meshStandardMaterial
            color={mountainColors[index % mountainColors.length]}
            roughness={1}
            transparent
            opacity={0.72}
          />
        </mesh>
      ))}
    </group>
  )
}

function SkyBackdrop() {
  const clouds = [
    { position: [-7, 8.2, -29] as [number, number, number], scale: [5.8, 1.1, 1] as [number, number, number] },
    { position: [1.5, 9.2, -31] as [number, number, number], scale: [8.5, 1.25, 1] as [number, number, number] },
    { position: [8, 7.8, -28] as [number, number, number], scale: [5.2, 1, 1] as [number, number, number] },
  ]

  return (
    <group>
      {clouds.map((cloud, index) => (
        <mesh key={index} position={cloud.position} scale={cloud.scale}>
          <circleGeometry args={[1, 18]} />
          <meshBasicMaterial color="#d5d9d7" transparent opacity={0.38} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function BattleFieldScene({ cameraMode }: BattleField3DProps) {
  return (
    <>
      <color attach="background" args={['#aab5b6']} />
      <fog attach="fog" args={['#aab5b6', 16, 38]} />
      <ambientLight intensity={1.65} />
      <directionalLight
        castShadow
        position={[-4, 8, 6]}
        intensity={1.9}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <CameraRig cameraMode={cameraMode} />
      <SkyBackdrop />
      <Mountains />
      <Ground />
      <Trees />
    </>
  )
}

export function BattleField3D({ cameraMode }: BattleField3DProps) {
  return (
    <div className="battle-field-3d" aria-hidden="true">
      <Canvas
        shadows
        dpr={[1, 1.5]}
      >
        <BattleFieldScene cameraMode={cameraMode} />
      </Canvas>
    </div>
  )
}
