'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import { useInView } from 'framer-motion';

import cardGLB from '/card.glb';
import lanyard from '/lanyard.png';

import * as THREE from 'three';
import './Lanyard.css';

extend({ MeshLineGeometry, MeshLineMaterial });

export default function Lanyard({ position = [0, 0, 30], gravity = [0, -40, 0], fov = 20, transparent = true, sectionRef }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Shared ref: normalized pointer position relative to canvas bounds,
  // but tracked across the entire section so dragging works outside the canvas.
  const sectionPointerRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { margin: '200px' });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Standard React effect to handle section-wide pointer tracking
  useEffect(() => {
    const container = sectionRef?.current
      ?? containerRef.current?.closest('section')
      ?? containerRef.current;
    if (!container) return;

    let canvas = containerRef.current?.querySelector('canvas');
    let cachedRect = null;

    const handleResize = () => {
      cachedRect = null;
    };
    window.addEventListener('resize', handleResize);

    const onPointerMove = (e) => {
      if (!canvas) {
        canvas = containerRef.current?.querySelector('canvas');
      }
      if (!canvas) return;
      if (!cachedRect) {
        cachedRect = canvas.getBoundingClientRect();
      }
      sectionPointerRef.current = {
        x: ((e.clientX - cachedRect.left) / cachedRect.width) * 2 - 1,
        y: -((e.clientY - cachedRect.top) / cachedRect.height) * 2 + 1,
      };
    };

    container.addEventListener('pointermove', onPointerMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointermove', onPointerMove);
    };
  }, [sectionRef]);

  return (
    <div ref={containerRef} className="lanyard-wrapper">
      <Canvas
        frameloop={isInView ? 'always' : 'never'}
        camera={{ position: position, fov: fov }}
        dpr={[1, isMobile ? 1.5 : 2]}
        gl={{ alpha: transparent }}
        onCreated={({ gl }) => {
          gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1);
        }}
      >
        <ambientLight intensity={Math.PI} />
        <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
          {/* Pass sectionPointerRef so Band uses section-wide coordinates */}
          <Band isMobile={isMobile} sectionPointerRef={sectionPointerRef} />
        </Physics>
        <Environment blur={0.75}>
          <Lightformer
            intensity={2}
            color="white"
            position={[0, -1, 5]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[-1, -1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={3}
            color="white"
            position={[1, 1, 1]}
            rotation={[0, 0, Math.PI / 3]}
            scale={[100, 0.1, 1]}
          />
          <Lightformer
            intensity={10}
            color="white"
            position={[-10, 0, 14]}
            rotation={[0, Math.PI / 2, Math.PI / 3]}
            scale={[100, 10, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}

function Band({ maxSpeed = 50, minSpeed = 0, isMobile = false, sectionPointerRef }) {
  const band = useRef(),
    fixed = useRef(),
    j1 = useRef(),
    j2 = useRef(),
    j3 = useRef(),
    card = useRef();
  const vec = new THREE.Vector3(),
    ang = new THREE.Vector3(),
    rot = new THREE.Vector3(),
    dir = new THREE.Vector3();
  const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };
  const { nodes, materials } = useGLTF(cardGLB);
  const texture = useTexture(lanyard);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }, [texture]);

  const [curve] = useState(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    c.curveType = 'chordal';
    return c;
  });
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.5, 0]
  ]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      // Use section-wide pointer coordinates (normalized to canvas bounds).
      // Falls back to state.pointer if ref isn't populated yet.
      const px = sectionPointerRef?.current?.x ?? state.pointer.x;
      const py = sectionPointerRef?.current?.y ?? state.pointer.y;

      vec.set(px, py, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    if (fixed.current) {
      const tFixed = fixed.current.translation();
      const tJ1 = j1.current?.translation();
      const tJ2 = j2.current?.translation();
      const tJ3 = j3.current?.translation();

      const isValid = (t) => t && typeof t.x === 'number' && !isNaN(t.x) && !isNaN(t.y) && !isNaN(t.z);

      if (isValid(tFixed) && isValid(tJ1) && isValid(tJ2) && isValid(tJ3)) {
        [j1, j2].forEach(ref => {
          const trans = ref.current.translation();
          if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3(trans.x, trans.y, trans.z);
          const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(trans)));
          ref.current.lerped.lerp(
            new THREE.Vector3(trans.x, trans.y, trans.z),
            delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
          );
        });
        curve.points[0].copy(tJ3);
        curve.points[1].copy(j2.current.lerped);
        curve.points[2].copy(j1.current.lerped);
        curve.points[3].copy(tFixed);
        
        const curvePoints = curve.getPoints(isMobile ? 16 : 32);
        if (curvePoints.every(isValid) && band.current?.geometry) {
          band.current.geometry.setPoints(curvePoints);
        }
      }

      const angvel = card.current?.angvel();
      const rotation = card.current?.rotation();
      if (isValid(angvel) && rotation && !isNaN(rotation.y)) {
        ang.copy(angvel);
        rot.copy(rotation);
        card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
      }
    }
  });

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={e => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={e => (
              e.target.setPointerCapture(e.pointerId),
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
            )}
          >
            <mesh geometry={nodes.card.geometry}>
              <meshPhysicalMaterial
                map={materials.base.map}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.8}
              />
            </mesh>
            <mesh geometry={nodes.clip.geometry} material={materials.metal} material-roughness={0.3} />
            <mesh geometry={nodes.clamp.geometry} material={materials.metal} />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          transparent={true}
          repeat={[-4, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}
