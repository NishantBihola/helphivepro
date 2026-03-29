import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { ArrowUpRight, Menu, X, Github, Twitter, Instagram, Linkedin, Plus } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera, Environment, ContactShadows, DragControls, RoundedBox, Stars } from "@react-three/drei";
import * as THREE from "three";

// --- 3D Components ---

const pipeOuterRadius = 0.25;
const pipeInnerRadius = 0.12;
const pipeLength = 1.6;

const pipeShape = new THREE.Shape();
pipeShape.absarc(0, 0, pipeOuterRadius, 0, Math.PI * 2, false);
const pipeHole = new THREE.Path();
pipeHole.absarc(0, 0, pipeInnerRadius, 0, Math.PI * 2, true);
pipeShape.holes.push(pipeHole);

const pipeExtrudeSettings = {
  depth: pipeLength,
  bevelEnabled: true,
  bevelSegments: 4,
  steps: 1,
  bevelSize: 0.04,
  bevelThickness: 0.04,
  curveSegments: 24
};

function BeeSwarm({ active }: { active: boolean }) {
  const count = 30;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const stripe1Ref = useRef<THREE.InstancedMesh>(null);
  const stripe2Ref = useRef<THREE.InstancedMesh>(null);
  const wing1Ref = useRef<THREE.InstancedMesh>(null);
  const wing2Ref = useRef<THREE.InstancedMesh>(null);
  const eye1Ref = useRef<THREE.InstancedMesh>(null);
  const eye2Ref = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const wingDummy1 = useMemo(() => new THREE.Object3D(), []);
  const wingDummy2 = useMemo(() => new THREE.Object3D(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const posVec = useMemo(() => new THREE.Vector3(), []);
  const nextPosVec = useMemo(() => new THREE.Vector3(), []);

  const geos = useMemo(() => {
    const body = new THREE.CapsuleGeometry(0.1, 0.2, 8, 8);
    body.rotateX(Math.PI / 2);

    const stripe1 = new THREE.CylinderGeometry(0.105, 0.105, 0.05, 16);
    stripe1.rotateX(Math.PI / 2);
    stripe1.translate(0, 0, -0.05);

    const stripe2 = new THREE.CylinderGeometry(0.105, 0.105, 0.05, 16);
    stripe2.rotateX(Math.PI / 2);
    stripe2.translate(0, 0, 0.08);

    const wing = new THREE.SphereGeometry(0.08, 8, 8);
    wing.scale(1, 0.1, 0.6);
    
    const wing1 = wing.clone();
    wing1.rotateY(-Math.PI / 6);
    wing1.translate(0.08, 0.1, 0);

    const wing2 = wing.clone();
    wing2.rotateY(Math.PI / 6);
    wing2.translate(-0.08, 0.1, 0);

    const eye = new THREE.SphereGeometry(0.03, 8, 8);
    const eye1 = eye.clone();
    eye1.translate(0.04, 0.05, -0.15);
    const eye2 = eye.clone();
    eye2.translate(-0.04, 0.05, -0.15);

    return { body, stripe1, stripe2, wing1, wing2, eye1, eye2 };
  }, []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        t: 0,
        speed: 0.02 + Math.random() * 0.03,
        angle1: Math.random() * Math.PI * 2,
        angle2: Math.random() * Math.PI * 2,
        radius: 2 + Math.random() * 3,
        wiggleSpeed: 20 + Math.random() * 20,
      });
    }
    return temp;
  }, [count]);

  useEffect(() => {
    if (active) {
      particles.forEach(p => p.t = 0);
    }
  }, [active, particles]);

  useFrame((state, delta) => {
    if (!active || !bodyRef.current) return;
    
    const getPos = (t: number, p: any, i: number, targetVec: THREE.Vector3) => {
      // Burst expansion that slows down using power function
      const expansion = Math.pow(t, 0.7) * p.radius * p.speed * 15;
      const dirX = Math.cos(p.angle1) * Math.sin(p.angle2);
      const dirY = Math.sin(p.angle1) * Math.sin(p.angle2);
      const dirZ = Math.cos(p.angle2);
      
      // Procedural organic wandering using sum of sines (pseudo-noise)
      const wanderAmp = 0.2 + t * 0.6;
      const wanderX = (Math.sin(t * 2.1 + i) + Math.sin(t * 4.7 + i * 2) * 0.5) * wanderAmp;
      const wanderY = (Math.sin(t * 2.3 + i * 3) + Math.sin(t * 4.1 + i * 4) * 0.5) * wanderAmp;
      const wanderZ = (Math.sin(t * 1.9 + i * 5) + Math.sin(t * 5.3 + i * 6) * 0.5) * wanderAmp;
      
      targetVec.set(
        dirX * expansion + wanderX,
        dirY * expansion + wanderY + t * 0.3, // slight upward lift
        dirZ * expansion + wanderZ
      );
    };

    particles.forEach((particle, i) => {
      particle.t += delta * 1.2;
      const { t, wiggleSpeed } = particle;
      
      getPos(t, particle, i, posVec);
      getPos(t + 0.05, particle, i, nextPosVec);
      
      dummy.position.copy(posVec);
      dummy.lookAt(nextPosVec);
      
      // Add banking and wiggling
      dummy.rotateZ(Math.sin(t * wiggleSpeed) * 0.15);
      dummy.rotateX(Math.cos(t * wiggleSpeed) * 0.15);
      
      const scale = Math.max(0, 1 - t * 0.35);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      
      bodyRef.current!.setMatrixAt(i, dummy.matrix);
      stripe1Ref.current!.setMatrixAt(i, dummy.matrix);
      stripe2Ref.current!.setMatrixAt(i, dummy.matrix);
      eye1Ref.current!.setMatrixAt(i, dummy.matrix);
      eye2Ref.current!.setMatrixAt(i, dummy.matrix);

      const flap = Math.sin(t * 80) * 0.5;
      wingDummy1.copy(dummy);
      wingDummy1.rotateZ(flap);
      wingDummy1.updateMatrix();
      wing1Ref.current!.setMatrixAt(i, wingDummy1.matrix);

      wingDummy2.copy(dummy);
      wingDummy2.rotateZ(-flap);
      wingDummy2.updateMatrix();
      wing2Ref.current!.setMatrixAt(i, wingDummy2.matrix);
    });
    
    bodyRef.current.instanceMatrix.needsUpdate = true;
    stripe1Ref.current!.instanceMatrix.needsUpdate = true;
    stripe2Ref.current!.instanceMatrix.needsUpdate = true;
    wing1Ref.current!.instanceMatrix.needsUpdate = true;
    wing2Ref.current!.instanceMatrix.needsUpdate = true;
    eye1Ref.current!.instanceMatrix.needsUpdate = true;
    eye2Ref.current!.instanceMatrix.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[geos.body, undefined, count]}>
        <meshStandardMaterial color="#ffb300" roughness={0.4} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={stripe1Ref} args={[geos.stripe1, undefined, count]}>
        <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={stripe2Ref} args={[geos.stripe2, undefined, count]}>
        <meshStandardMaterial color="#111111" roughness={0.6} metalness={0.1} />
      </instancedMesh>
      <instancedMesh ref={wing1Ref} args={[geos.wing1, undefined, count]}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={0.2} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={wing2Ref} args={[geos.wing2, undefined, count]}>
        <meshStandardMaterial color="#ffffff" transparent opacity={0.8} roughness={0.2} side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={eye1Ref} args={[geos.eye1, undefined, count]}>
        <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.8} />
      </instancedMesh>
      <instancedMesh ref={eye2Ref} args={[geos.eye2, undefined, count]}>
        <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.8} />
      </instancedMesh>
    </group>
  );
}

function CrossShape({ position, color, scrollY, index }: { position: [number, number, number], color: string, scrollY: any, index: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const repulsionRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const [beesActive, setBeesActive] = useState(false);
  
  // Spring values for smooth animation
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current || !repulsionRef.current) return;
    
    // 1. Base rotation
    meshRef.current.rotation.x += 0.002 * (index % 2 === 0 ? 1 : -1);
    meshRef.current.rotation.y += 0.003 * (index % 3 === 0 ? 1 : -1);
    meshRef.current.rotation.z = scrollY.get() * 2;
    
    // 2. Scroll reaction & Mouse Repulsion
    const scrollVal = scrollY.get();
    const scrollOffset = scrollVal * 5 * (index % 2 === 0 ? 1 : -0.5);

    // Get mouse position in world space (approximate on z=0 plane)
    const mouseVec = new THREE.Vector3(state.pointer.x, state.pointer.y, 0.5);
    mouseVec.unproject(state.camera);
    mouseVec.sub(state.camera.position).normalize();
    const distance = -state.camera.position.z / mouseVec.z;
    const worldMousePos = new THREE.Vector3().copy(state.camera.position).add(mouseVec.multiplyScalar(distance));

    const worldGroupPos = new THREE.Vector3();
    groupRef.current.getWorldPosition(worldGroupPos);
    
    const distToMouse = worldGroupPos.distanceTo(worldMousePos);
    const maxDist = 5; // Radius of repulsion
    
    targetPos.current.set(0, scrollOffset, 0);
    
    if (distToMouse < maxDist) {
      // Push away strongly
      const force = Math.pow((maxDist - distToMouse) / maxDist, 2); // Non-linear falloff
      const dir = worldGroupPos.clone().sub(worldMousePos).normalize();
      targetPos.current.add(dir.multiplyScalar(force * 6)); // Push up to 6 units away
    }

    // Lerp inner mesh position towards target (magnetic snap back)
    repulsionRef.current.position.lerp(targetPos.current, delta * 8);
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={repulsionRef}>
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <group 
            ref={meshRef} 
            onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'grab'; }}
            onPointerOut={(e) => { document.body.style.cursor = 'auto'; }}
            onClick={(e) => { 
              e.stopPropagation(); 
              setBeesActive(false);
              setTimeout(() => setBeesActive(true), 10);
            }}
          >
            <mesh position={[0, 0, -pipeLength / 2]} castShadow receiveShadow>
              <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
              <meshStandardMaterial color={color} roughness={0.1} metalness={0.6} />
            </mesh>
            <group rotation={[0, Math.PI / 2, 0]}>
              <mesh position={[0, 0, -pipeLength / 2]} castShadow receiveShadow>
                <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
                <meshStandardMaterial color={color} roughness={0.1} metalness={0.6} />
              </mesh>
            </group>
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <mesh position={[0, 0, -pipeLength / 2]} castShadow receiveShadow>
                <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
                <meshStandardMaterial color={color} roughness={0.1} metalness={0.6} />
              </mesh>
            </group>
            <BeeSwarm active={beesActive} />
          </group>
        </Float>
      </group>
    </group>
  );
}

function HeroScene({ scrollYProgress }: { scrollYProgress: any }) {
  // 10 honey yellow, 11 white, 5 black
  const colors = useMemo(() => {
    const arr = [];
    for(let i=0; i<10; i++) arr.push("#ffb300");
    for(let i=0; i<11; i++) arr.push("#ffffff");
    for(let i=0; i<5; i++) arr.push("#111111");
    return arr.sort(() => Math.random() - 0.5);
  }, []);

  // Clustered initial positions (tighter cluster)
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for(let i=0; i<26; i++) {
      // Cluster them tightly in the center
      pos.push([
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3.5
      ]);
    }
    return pos;
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={50} />
      <ambientLight intensity={0.8} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={1} />
      
      <Suspense fallback={null}>
        <DragControls>
          {positions.map((pos, i) => (
            <CrossShape 
              key={i} 
              index={i}
              position={pos} 
              color={colors[i]} 
              scrollY={scrollYProgress} 
            />
          ))}
        </DragControls>
        <Environment preset="city" />
      </Suspense>
      <ContactShadows position={[0, -6, 0]} opacity={0.4} scale={30} blur={2} far={8} />
    </>
  );
}

function DeepDiveScene({ scrollProgress }: { scrollProgress: any }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    const scroll = scrollProgress.get();
    if (cameraRef.current) {
      // Move camera deep into the tunnel
      cameraRef.current.position.z = 10 - scroll * 200;
    }
    if (groupRef.current) {
      // The "astronaut" substitute moves slightly ahead of the camera and spins wildly
      groupRef.current.position.z = 5 - scroll * 200;
      groupRef.current.rotation.y = scroll * Math.PI * 8;
      groupRef.current.rotation.x = scroll * Math.PI * 4;
    }
  });

  // Generate tunnel segments
  const tunnelSegments = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      position: [0, 0, -i * 4] as [number, number, number],
      rotation: [0, 0, Math.random() * Math.PI] as [number, number, number],
      color: i % 2 === 0 ? "#ffb300" : "#00ffaa",
      isWireframe: i % 3 !== 0
    }));
  }, []);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 10]} fov={75} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 10]} intensity={2} />
      <pointLight position={[0, 0, 0]} intensity={5} color="#ffb300" distance={20} />

      {/* Central Object (Astronaut Substitute) */}
      <group ref={groupRef}>
        <Float speed={4} rotationIntensity={2} floatIntensity={2}>
          <mesh castShadow receiveShadow>
            <torusKnotGeometry args={[1, 0.3, 128, 32]} />
            <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
          </mesh>
        </Float>
      </group>

      {/* Tunnel Environment */}
      {tunnelSegments.map((seg, i) => (
        <group key={i} position={seg.position}>
          <mesh rotation={seg.rotation}>
            <boxGeometry args={[10, 10, 2]} />
            <meshStandardMaterial
              color={seg.color}
              wireframe={seg.isWireframe}
              transparent
              opacity={seg.isWireframe ? 0.3 : 0.8}
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          {/* Floating debris */}
          <mesh position={[(Math.random() - 0.5) * 15, (Math.random() - 0.5) * 15, 0]} rotation={[Math.random(), Math.random(), 0]}>
            <octahedronGeometry args={[0.5 + Math.random()]} />
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} />
          </mesh>
        </group>
      ))}
      <Stars radius={50} depth={100} count={5000} factor={4} saturation={1} fade speed={2} />
    </>
  );
}

// --- Logo Component ---

function LogoModel() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.5;
      ref.current.rotation.y += delta * 0.5;
    }
  });
  return (
    <group ref={ref} scale={0.6}>
      <mesh position={[0, 0, -pipeLength / 2]}>
        <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
        <meshStandardMaterial color="#ffb300" roughness={0.1} metalness={0.6} />
      </mesh>
      <group rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, -pipeLength / 2]}>
          <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
          <meshStandardMaterial color="#ffb300" roughness={0.1} metalness={0.6} />
        </mesh>
      </group>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, -pipeLength / 2]}>
          <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
          <meshStandardMaterial color="#ffb300" roughness={0.1} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function Logo3D() {
  return (
    <div className="w-10 h-10">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        <Environment preset="city" />
        <LogoModel />
      </Canvas>
    </div>
  );
}

// --- Main App Component ---

const projectsData = [
  { title: "Devin AI", category: "WEB • DESIGN • 3D", image: "https://picsum.photos/seed/devin/800/600" },
  { title: "Porsche: Dream", category: "CONCEPT • 3D • VIDEO", image: "https://picsum.photos/seed/porsche/800/600" },
  { title: "Synthetic Human", category: "WEB • DEVELOPMENT • 3D", image: "https://picsum.photos/seed/human/800/600" },
  { title: "Meta: Spatial", category: "AR • DEVELOPMENT • 3D", image: "https://picsum.photos/seed/meta/800/600" },
];

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Scroll tracking for Hero
  const { scrollYProgress: heroScroll } = useScroll();
  const scaleX = useSpring(heroScroll, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Scroll tracking for Combined Section
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: sectionScrollRaw } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });
  
  const sectionScroll = useSpring(sectionScrollRaw, { stiffness: 50, damping: 20, restDelta: 0.001 });
  
  const lineParallaxY = useTransform(sectionScrollRaw, [0, 1], [0, 800]);

  const videoWidth = useTransform(sectionScroll, [0.1, 0.8], ["40vw", "100vw"]);
  const videoHeight = useTransform(sectionScroll, [0.1, 0.8], ["50vh", "100vh"]);
  const videoX = useTransform(sectionScroll, [0.1, 0.8], ["-25vw", "0vw"]);
  const videoY = useTransform(sectionScroll, [0.1, 0.8], ["-30vh", "0vh"]);
  const videoBorderRadius = useTransform(sectionScroll, [0.1, 0.8], ["24px", "0px"]);

  // Scroll tracking for Deep Dive
  const deepDiveRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: deepDiveProgress } = useScroll({
    target: deepDiveRef,
    offset: ["start start", "end end"]
  });

  const deepDiveTextOpacity = useTransform(deepDiveProgress, [0, 0.05, 0.15, 0.2], [0, 1, 1, 0]);
  const deepDiveTextScale = useTransform(deepDiveProgress, [0, 0.2], [0.8, 1.5]);

  return (
    <div className="bg-[#f3f4f6] text-black min-h-screen font-sans selection:bg-[#ffb300] selection:text-white">
      {/* Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#ffb300] z-[100] origin-left" style={{ scaleX }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full p-8 flex justify-between items-center z-50 mix-blend-difference text-white">
        <div className="flex items-center gap-3 text-2xl font-bold tracking-tighter">
          <Logo3D />
          HelpHive.
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Fullscreen Menu Overlay */}
      <motion.div
        initial={false}
        animate={isMenuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 bg-[#ffb300] text-white z-40 flex flex-col items-center justify-center gap-8 p-8"
      >
        {["WORK", "STUDIO", "CULTURE", "CONTACT"].map((item, i) => (
          <motion.a
            key={item} href="#"
            initial={{ opacity: 0, y: 20 }}
            animate={isMenuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: i * 0.1 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter hover:italic transition-all"
            onClick={() => setIsMenuOpen(false)}
          >
            {item}
          </motion.a>
        ))}
      </motion.div>

      {/* 1. Hero Section (Dark) */}
      <section className="relative h-screen bg-[#050505] text-white overflow-hidden">
        <div className="absolute inset-0 z-10">
          <Canvas dpr={[1, 2]} shadows>
            <HeroScene scrollYProgress={heroScroll} />
          </Canvas>
        </div>
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/40 font-mono text-xs tracking-widest z-20 pointer-events-none flex items-center gap-4">
          <Plus size={12} /> SCROLL TO EXPLORE <Plus size={12} />
        </div>
      </section>

      {/* Wrapper for Line Animation Sections */}
      <div ref={sectionRef} className="relative overflow-hidden bg-[#f3f4f6]">
        {/* Decorative curved line */}
        <motion.svg 
          className="absolute top-0 left-0 w-full h-full pointer-events-none text-[#ffb300] z-0" 
          viewBox="0 0 1000 4000" 
          preserveAspectRatio="none"
          style={{ y: lineParallaxY }}
        >
          <motion.path 
            d="M-100,200 C400,-100 800,600 500,1000 C200,1400 -200,1200 100,1800 C400,2400 1100,2000 800,2800 C500,3600 200,3200 500,3800" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="80"
            strokeLinecap="round"
            style={{ pathLength: sectionScroll }}
          />
        </motion.svg>

        {/* Combined Within Reach & Video Section */}
        <section className="relative h-[250vh] z-10">
          
          {/* Normal flow content (scrolls away naturally) */}
          <div className="absolute top-0 left-0 w-full z-20 pointer-events-none">
            <div className="max-w-7xl mx-auto px-8 pt-32">
              <h2 className="text-[12vw] leading-[0.85] font-bold tracking-tighter mb-16 text-black">
                Within Reach
              </h2>
              <div className="flex flex-col md:flex-row justify-end gap-12">
                <div className="w-full md:w-1/2 md:pl-12 pointer-events-auto">
                  <p className="text-xl leading-relaxed text-gray-700 mb-8">
                    HelpHive is a digital production studio that brings your ideas to life through visually captivating designs and interactive experiences. With our talented team, we push the boundaries to solve complex problems, delivering tailored solutions that exceed expectations and engage audiences.
                  </p>
                  <button className="px-8 py-4 bg-white border border-gray-200 rounded-full font-bold hover:bg-gray-50 transition-colors flex items-center gap-3 shadow-sm">
                    <div className="w-2 h-2 bg-black rounded-full" /> ABOUT US
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Video */}
          <div className="sticky top-0 h-screen w-full flex items-center justify-center overflow-hidden pointer-events-none z-10">
            <motion.div 
              className="relative bg-blue-600 overflow-hidden shadow-2xl pointer-events-auto flex-shrink-0"
              style={{
                width: videoWidth,
                height: videoHeight,
                x: videoX,
                y: videoY,
                borderRadius: videoBorderRadius,
              }}
            >
              <video 
                className="w-full h-full object-cover mix-blend-screen opacity-80"
                autoPlay 
                loop 
                muted 
                playsInline
                poster="https://picsum.photos/seed/video-poster/1920/1080"
              >
                <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
              </video>
              
              {/* Blue tint overlay */}
              <div className="absolute inset-0 bg-blue-600/30 mix-blend-color pointer-events-none" />

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <motion.div 
                  style={{ opacity: useTransform(sectionScroll, [0, 0.2], [1, 0]) }}
                  className="w-16 h-16 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-lg pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
                >
                  <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-black border-b-[8px] border-b-transparent ml-1 md:border-t-[12px] md:border-l-[20px] md:border-b-[12px] md:ml-2" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* 3. Featured Work Section (Light) */}
      <section className="py-32 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <h2 className="text-6xl md:text-8xl font-bold tracking-tighter">Featured Work</h2>
            <p className="max-w-xs text-sm font-mono text-gray-500 uppercase tracking-widest">
              A selection of our most uniquely crafted works with partners, clients and friends over the years.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {projectsData.map((project, i) => (
              <motion.div 
                key={project.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="group cursor-pointer"
              >
                <div className="overflow-hidden rounded-3xl aspect-[4/3] mb-6 bg-gray-200">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-bold tracking-tight mb-2">{project.title}</h3>
                    <p className="text-xs font-mono text-gray-500 tracking-widest">{project.category}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Deep Dive / Astronaut Section (Dark & Immersive) */}
      <section ref={deepDiveRef} className="h-[400vh] relative bg-black">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Canvas dpr={[1, 2]}>
            <DeepDiveScene scrollProgress={deepDiveProgress} />
          </Canvas>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-8">
            <motion.h2 
              style={{ opacity: deepDiveTextOpacity, scale: deepDiveTextScale }} 
              className="text-white text-4xl md:text-7xl font-bold text-center tracking-tighter leading-tight mix-blend-difference"
            >
              STEP INTO A NEW WORLD<br/>
              AND LET YOUR<br/>
              IMAGINATION RUN WILD
            </motion.h2>
          </div>
        </div>
      </section>

      {/* 5. Footer (Dark) */}
      <footer className="bg-[#050505] text-white py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
            <div>
              <h2 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8">LET'S TALK</h2>
              <div className="space-y-4 font-mono text-sm text-white/60">
                <p>General enquires<br/><a href="#" className="text-white hover:text-[#ffb300] transition-colors">hello@helphive.com</a></p>
                <p>New business<br/><a href="#" className="text-white hover:text-[#ffb300] transition-colors">business@helphive.com</a></p>
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <div className="relative">
                <input 
                  type="email" 
                  placeholder="Your email" 
                  className="w-full bg-white/5 border border-white/20 rounded-full px-8 py-4 text-white outline-none focus:border-[#ffb300] transition-colors"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                  <ArrowUpRight size={24} />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 border-t border-white/10 font-mono text-xs text-white/40">
            <div className="flex gap-8">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
            </div>
            <div>R&D: labs.helphive.com</div>
            <div>Built by HelpHive 💙</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

