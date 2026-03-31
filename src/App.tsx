import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from "react";
import Lenis from "@studio-freight/lenis";
import { ArrowUpRight, Menu, X, Github, Twitter, Instagram, Linkedin, Plus, Shield, Zap, Award, Globe, Check, Mail, MapPin as MapPinIcon, ExternalLink, Heart } from "lucide-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, PerspectiveCamera, Environment, ContactShadows, DragControls, RoundedBox, Stars } from "@react-three/drei";
import { Physics, useSphere, usePlane } from "@react-three/cannon";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as d3Ease from "d3-ease";
import { Routes, Route, useNavigate, Link, useLocation } from "react-router-dom";
import ProtocolPage from "./pages/ProtocolPage";
import StudioPage from "./pages/StudioPage";
import ContactPage from "./pages/ContactPage";
import Dashboard from "./pages/Dashboard";
import { AuthModal } from "./components/Modals";
import { useAuth } from "./firebase";

gsap.registerPlugin(ScrollTrigger);

// --- Custom Hooks ---

function useCountUp(target: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
    const easedProgress = d3Ease.easeExpOut(progress);
    const currentCount = Math.floor(easedProgress * target);
    
    setCount(currentCount);
    countRef.current = currentCount;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }, [target, duration]);

  useEffect(() => {
    if (start) {
      requestAnimationFrame(animate);
    }
  }, [start, animate]);

  return count;
}

// --- 3D Components ---

const pipeOuterRadius = 0.15;
const pipeInnerRadius = 0.06;
const pipeLength = 1.5;

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

// --- Audio Helper ---
const playBuzzSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.warn("Audio context failed", e);
  }
};

function BeeSwarm({ trigger }: { trigger: number }) {
  const count = 30;
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const stripe1Ref = useRef<THREE.InstancedMesh>(null);
  const stripe2Ref = useRef<THREE.InstancedMesh>(null);
  const wing1Ref = useRef<THREE.InstancedMesh>(null);
  const wing2Ref = useRef<THREE.InstancedMesh>(null);
  const eye1Ref = useRef<THREE.InstancedMesh>(null);
  const eye2Ref = useRef<THREE.InstancedMesh>(null);

  const [active, setActive] = useState(false);

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
    if (trigger > 0) {
      setActive(true);
      particles.forEach(p => p.t = 0);
    }
  }, [trigger, particles]);

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

function ConnectorModel({ position, color: initialColor, index, setIsHovering }: { position: [number, number, number], color: string, index: number, setIsHovering: (val: boolean) => void }) {
  const [beeTrigger, setBeeTrigger] = useState(0);
  const [colorIndex, setColorIndex] = useState(-1); // -1 uses initialColor
  const { viewport } = useThree();
  
  const cycleColors = ["#ff0000", "#00ff00", "#ffb300"]; // Red, Green, Yellow

  // Physics body
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position,
    args: [0.7], // Collision radius
    linearDamping: 0.95,
    angularDamping: 0.95,
    type: 'Dynamic'
  }));

  // Randomize size slightly for organic feel
  const scale = useMemo(() => 0.8 + Math.random() * 0.4, []);

  const currentColor = useMemo(() => {
    if (colorIndex === -1) return initialColor;
    return cycleColors[colorIndex % cycleColors.length];
  }, [colorIndex, initialColor]);

  useFrame((state) => {
    if (!ref.current) return;

    // 1. Central Gravity / Attraction to center
    const currentPos = new THREE.Vector3();
    ref.current.getWorldPosition(currentPos);
    
    // Subtle attraction to keep them in view
    const strength = 0.8;
    api.applyForce([
      -currentPos.x * strength,
      -currentPos.y * strength,
      -currentPos.z * strength
    ], [0, 0, 0]);

    // 2. Magnetic Repulsion from Cursor (Smooth "Move Apart" effect)
    const mouseVec = new THREE.Vector3(
      (state.pointer.x * viewport.width) / 2,
      (state.pointer.y * viewport.height) / 2,
      0
    );
    const distToMouse = currentPos.distanceTo(mouseVec);
    const interactionDist = 6;

    if (distToMouse < interactionDist) {
      // Push away from mouse with a smooth magnetic curve
      // Using applyForce for smoother continuous movement
      const pushStrength = 45 * Math.pow(1 - distToMouse / interactionDist, 2);
      const dir = currentPos.clone().sub(mouseVec).normalize();
      api.applyForce([
        dir.x * pushStrength,
        dir.y * pushStrength,
        dir.z * pushStrength
      ], [0, 0, 0]);
      
      // Add a slight random jitter to help them "break apart"
      api.applyImpulse([
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ], [0, 0, 0]);
    }

    // 3. Subtle floating rotation (Video effect: constant slow spin)
    api.applyTorque([
      Math.sin(state.clock.elapsedTime * 0.5 + index) * 0.2,
      Math.cos(state.clock.elapsedTime * 0.3 + index) * 0.2,
      Math.sin(state.clock.elapsedTime * 0.4 + index) * 0.2
    ]);
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    setBeeTrigger(prev => prev + 1);
    setColorIndex(prev => prev + 1);
    playBuzzSound();
    
    // Physics impulse: kick the model away
    const impulse = 5;
    api.applyImpulse([
      (Math.random() - 0.5) * impulse,
      (Math.random() - 0.5) * impulse,
      (Math.random() - 0.5) * impulse
    ], [0, 0, 0]);
  };

  return (
    <group ref={ref as any} onClick={handleClick}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <group 
          scale={[scale, scale, scale]}
          onPointerOver={(e) => { e.stopPropagation(); setIsHovering(true); }}
          onPointerOut={(e) => { setIsHovering(false); }}
        >
          {/* 3 Intersecting Pipes to form the 3D Jack/Cross shape */}
          <mesh castShadow receiveShadow position={[0, 0, -pipeLength / 2]}>
            <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
            <meshPhysicalMaterial color={currentColor} roughness={0.05} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, pipeLength / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
            <meshPhysicalMaterial color={currentColor} roughness={0.05} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
          </mesh>
          <mesh castShadow receiveShadow position={[-pipeLength / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
            <meshPhysicalMaterial color={currentColor} roughness={0.05} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
          </mesh>
          
          <BeeSwarm trigger={beeTrigger} />
        </group>
      </Float>
    </group>
  );
}

function HeroScene({ scrollYProgress, setIsHovering }: { scrollYProgress: any, setIsHovering: (val: boolean) => void }) {
  // Colors: Honey Yellow, Black, White (Hive Theme)
  const colors = useMemo(() => {
    const arr = [];
    for(let i=0; i<15; i++) arr.push("#ffb300"); // Honey Yellow
    for(let i=0; i<15; i++) arr.push("#050505"); // Black
    for(let i=0; i<10; i++) arr.push("#ffffff"); // White
    return arr.sort(() => Math.random() - 0.5);
  }, []);

  // Clustered initial positions (Denser cluster for video effect)
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for(let i=0; i<40; i++) {
      pos.push([
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4
      ]);
    }
    return pos;
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={50} />
      <ambientLight intensity={0.5} />
      <spotLight position={[20, 20, 20]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
      <pointLight position={[-20, -20, -20]} intensity={0.5} />
      
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]} iterations={10}>
          {positions.map((pos, i) => (
            <ConnectorModel 
              key={i} 
              index={i}
              position={pos} 
              color={colors[i % colors.length]} 
              setIsHovering={setIsHovering}
            />
          ))}
        </Physics>
        <Environment preset="city" />
      </Suspense>
      <ContactShadows position={[0, -10, 0]} opacity={0.4} scale={40} blur={2} far={15} />
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
        <meshPhysicalMaterial color="#ffb300" roughness={0.1} metalness={0.2} clearcoat={1} />
      </mesh>
      <group rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, -pipeLength / 2]}>
          <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
          <meshPhysicalMaterial color="#ffb300" roughness={0.1} metalness={0.2} clearcoat={1} />
        </mesh>
      </group>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[0, 0, -pipeLength / 2]}>
          <extrudeGeometry args={[pipeShape, pipeExtrudeSettings]} />
          <meshPhysicalMaterial color="#ffb300" roughness={0.1} metalness={0.2} clearcoat={1} />
        </mesh>
      </group>
    </group>
  );
}

function Logo3D() {
  return (
    <div className="w-8 h-8 md:w-10 md:h-10">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }} shadows={{ type: THREE.PCFShadowMap }}>
        <ambientLight intensity={0.8} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} />
        <pointLight position={[-10, -10, -10]} intensity={1} />
        <Environment preset="city" />
        <LogoModel />
      </Canvas>
    </div>
  );
}

// --- Vision Section Components ---

function StatCard({ 
  title, 
  value, 
  label, 
  icon: Icon, 
  isHovered, 
  onHover, 
  onLeave, 
  pushDir,
  startCount
}: { 
  title: string; 
  value: number; 
  label: string; 
  icon: any; 
  isHovered: boolean; 
  onHover: () => void; 
  onLeave: () => void;
  pushDir: { x: number; y: number };
  startCount: boolean;
}) {
  const count = useCountUp(value, 2500, startCount);
  
  return (
    <motion.div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      animate={{
        x: isHovered ? 0 : pushDir.x * 20,
        y: isHovered ? 0 : pushDir.y * 20,
        scale: isHovered ? 1.05 : 1,
        zIndex: isHovered ? 10 : 1
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`relative p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl flex flex-col gap-4 group transition-colors duration-500 ${isHovered ? 'border-[#ffb300]/50 bg-[#ffb300]/5' : ''}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#ffb300]/10 flex items-center justify-center text-[#ffb300] group-hover:bg-[#ffb300] group-hover:text-black transition-all duration-500">
        <Icon size={24} />
      </div>
      <div>
        <h3 className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em] mb-1">{title}</h3>
        <div className="text-5xl font-bold tracking-tighter text-white flex items-baseline gap-1">
          {count.toLocaleString()}{label}
        </div>
      </div>
      <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-[#ffb300]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </motion.div>
  );
}

function KineticPulseSection({ onJoinMission }: { onJoinMission: () => void }) {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [startCount, setStartCount] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Slide-in animations for cards
      gsap.from(".stat-card-0", {
        scrollTrigger: {
          trigger: ".stat-card-0",
          start: "top 85%",
          toggleActions: "play none none reverse"
        },
        x: -100,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out",
        onStart: () => setStartCount(true)
      });

      gsap.from(".stat-card-1", {
        scrollTrigger: {
          trigger: ".stat-card-1",
          start: "top 85%",
          toggleActions: "play none none reverse"
        },
        y: 100,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out"
      });

      gsap.from(".stat-card-2", {
        scrollTrigger: {
          trigger: ".stat-card-2",
          start: "top 85%",
          toggleActions: "play none none reverse"
        },
        x: 100,
        opacity: 0,
        duration: 1.2,
        ease: "power4.out"
      });

      // SVG Path Drawing
      if (pathRef.current) {
        const length = pathRef.current.getTotalLength();
        gsap.set(pathRef.current, { strokeDasharray: length, strokeDashoffset: length });
        
        gsap.to(pathRef.current, {
          strokeDashoffset: 0,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 60%",
            end: "bottom 80%",
            scrub: 1.5
          }
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const stats = [
    { title: "Network Density", value: 45000, label: "+", icon: Globe },
    { title: "Daily Exchanges", value: 12800, label: "", icon: Zap },
    { title: "Trust Score", value: 99, label: "%", icon: Award }
  ];

  const getPushDir = (index: number) => {
    if (hoveredIndex === null) return { x: 0, y: 0 };
    if (hoveredIndex === index) return { x: 0, y: 0 };
    
    // Simple logic to push away from the hovered card
    const diff = index - hoveredIndex;
    return { x: diff * 1.5, y: 0 };
  };

  return (
    <section ref={sectionRef} className="relative py-32 bg-[#050505] overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#ffb300]/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-6 md:px-16 lg:px-24 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center mb-32">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="w-12 h-[1px] bg-[#ffb300]" />
              <span className="text-[#ffb300] font-mono text-[10px] uppercase tracking-[0.6em] font-bold">Vision 2026</span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold tracking-tighter mb-10 leading-tight"
            >
              The Architecture <br />
              of <span className="text-[#ffb300]">Local Trust.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-lg text-white/60 mb-12 leading-relaxed max-w-xl"
            >
              We didn’t build another marketplace. We engineered a Community OS. 
              HelpHive is the digital layer that reconnects the physical world, 
              turning static neighborhoods into dynamic, self-healing ecosystems.
            </motion.p>

            <div className="grid sm:grid-cols-2 gap-8">
              {[
                { title: "Efficiency over Search", desc: "You shouldn't have to look for help; the Hive should bring it to you." },
                { title: "Reputation as Equity", desc: "Your value isn't in your wallet; it's in your history of being helpful." },
                { title: "Privacy by Design", desc: "Zero-Knowledge logic to verify you, without tracking you." },
                { title: "Neural Infrastructure", desc: "Neural infrastructure needed to trade, work, and support one another." }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex flex-col gap-2"
                >
                  <h4 className="text-[#ffb300] font-bold text-sm tracking-tight">{item.title}</h4>
                  <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* SVG Path connecting cards */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 400 600">
              <path
                ref={pathRef}
                d="M 200 50 C 350 150, 50 300, 200 450"
                fill="none"
                stroke="#ffb300"
                strokeWidth="2"
                strokeLinecap="round"
                className="opacity-20 blur-[1px]"
              />
              <path
                d="M 200 50 C 350 150, 50 300, 200 450"
                fill="none"
                stroke="#ffb300"
                strokeWidth="0.5"
                strokeLinecap="round"
                className="opacity-50"
              />
            </svg>

            <div className="flex flex-col gap-12 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mb-2"
              >
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Our Impact</h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-[#ffb300] animate-pulse" />
                  <span className="text-white/40 text-[10px] font-mono uppercase tracking-[0.3em]">Live Network Data</span>
                </div>
              </motion.div>

              {stats.map((stat, i) => (
                <div key={i} className={`stat-card-${i} ${i === 1 ? 'lg:ml-20' : ''}`}>
                  <StatCard
                    {...stat}
                    isHovered={hoveredIndex === i}
                    onHover={() => setHoveredIndex(i)}
                    onLeave={() => setHoveredIndex(null)}
                    pushDir={getPushDir(i)}
                    startCount={startCount}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-12 rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl text-center max-w-4xl mx-auto group"
        >
          <div className="w-16 h-16 rounded-full bg-[#ffb300]/10 flex items-center justify-center text-[#ffb300] mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
            <Shield size={32} />
          </div>
          <h3 className="text-3xl font-bold mb-6 tracking-tight">The Mission</h3>
          <p className="text-xl text-white/60 leading-relaxed italic mb-10">
            "To provide every neighborhood on earth with the neural infrastructure needed to trade, work, and support one another—instantly and securely."
          </p>
          <button 
            onClick={onJoinMission}
            className="px-10 py-5 bg-[#ffb300] text-black font-bold uppercase text-xs tracking-widest rounded-full hover:scale-105 transition-all duration-300"
          >
            Join the Mission
          </button>
        </motion.div>
      </div>
    </section>
  );
}



function ProductionGradeSection() {
  return (
    <section className="py-32 bg-[#050505] text-white">
      <div className="container mx-auto px-6 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl font-black tracking-tighter mb-6 italic">
              Production-Grade <br />
              <span className="text-[#ffb300]">Resilience.</span>
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-8">
              HelpHive is built for scale, security, and real-time coordination. Our architecture ensures your community stays connected, even under load, with enterprise-grade infrastructure.
            </p>
            <div className="flex gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Shield size={24} className="text-[#ffb300] mb-2" />
                <h4 className="font-bold">Secure</h4>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <Zap size={24} className="text-[#ffb300] mb-2" />
                <h4 className="font-bold">Fast</h4>
              </div>
            </div>
          </div>
          <div className="bg-[#111] p-8 rounded-[32px] border border-white/10">
            <h3 className="text-2xl font-bold mb-6">Infrastructure Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-white/10 pb-4">
                <span className="text-white/40">Uptime</span>
                <span className="font-bold text-[#ffb300]">99.99%</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-4">
                <span className="text-white/40">Latency</span>
                <span className="font-bold text-[#ffb300]">&lt; 50ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Security</span>
                <span className="font-bold text-[#ffb300]">ZK-Proof</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const navigate = useNavigate();
  
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-24 pb-12 overflow-hidden relative">
      <div className="container mx-auto px-6 md:px-16 lg:px-24 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          {/* Brand Column */}
          <div className="space-y-8">
            <div className="flex items-center gap-4 text-2xl font-bold tracking-tighter">
              <Logo3D />
              <span className="mt-1">HelpHive.</span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              The neural coordination layer for local communities. Decentralized, proximity-based, and human-scaled.
            </p>
            <div className="flex items-center gap-4">
              {[Twitter, Github, Instagram, Linkedin].map((Icon, i) => (
                <a 
                  key={i} 
                  href="#" 
                  className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-[#ffb300] hover:border-[#ffb300]/30 transition-all"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/20 mb-8">Ecosystem</h4>
            <ul className="space-y-4">
              {[
                { name: 'Neural Feed', path: '/dashboard' },
                { name: 'Community Nodes', path: '/protocol' },
                { name: 'Honey Protocol', path: '/protocol' },
                { name: 'Pricing', path: '/#price' },
                { name: 'Hive Studio', path: '/studio' },
                { name: 'Governance', path: '/protocol' }
              ].map((link) => (
                <li key={link.name}>
                  <button 
                    onClick={() => navigate(link.path)}
                    className="text-sm text-white/40 hover:text-white transition-colors text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/20 mb-8">Resources</h4>
            <ul className="space-y-4">
              {[
                { name: 'Documentation', path: '/protocol' },
                { name: 'API Reference', path: '/protocol' },
                { name: 'Whitepaper', path: '/protocol' },
                { name: 'Security Audit', path: '/protocol' },
                { name: 'Brand Assets', path: '/protocol' }
              ].map((link) => (
                <li key={link.name}>
                  <button 
                    onClick={() => navigate(link.path)}
                    className="text-sm text-white/40 hover:text-white transition-colors text-left"
                  >
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="space-y-8">
            <h4 className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/20 mb-8">Connect</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-white/40 hover:text-white transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#ffb300]/30 transition-all">
                  <Mail size={18} className="text-[#ffb300]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/20">Email</span>
                  <span className="text-sm font-medium">nodes@helphive.io</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-white/40 hover:text-white transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#ffb300]/30 transition-all">
                  <MapPinIcon size={18} className="text-[#ffb300]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/20">Node Location</span>
                  <span className="text-sm font-medium">Edmonton Hive Node 01</span>
                </div>
              </div>
            </div>
            <div className="pt-4">
              <button className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#ffb300] hover:underline">
                System Status: Operational <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest flex items-center gap-2">
            © 2026 HelpHive Neural Network. Built with <Heart size={10} className="text-red-500" /> for the Hive.
          </div>
          <div className="flex items-center gap-8 text-[10px] font-mono text-white/20 uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy Protocol</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Legal Node</a>
          </div>
        </div>
      </div>

      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ffb300]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
    </footer>
  );
}

// --- Main App Component ---

const projectsData = [
  { title: "Devin AI", category: "WEB • DESIGN • DEVELOPMENT • 3D", image: "https://picsum.photos/seed/devin/800/600" },
  { title: "Porsche: Dream Machine", category: "CONCEPT • 3D ILLUSTRATION • MOGRAPH • VIDEO", image: "https://picsum.photos/seed/porsche/800/600" },
  { title: "Spaace - NFT Marketplace", category: "WEB • DESIGN • DEVELOPMENT • 3D • WEB3", image: "https://picsum.photos/seed/spaace/800/600" },
  { title: "DDD 2024", category: "WEB • DESIGN • DEVELOPMENT • 3D", image: "https://picsum.photos/seed/ddd/800/600" },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/protocol" element={<ProtocolPage />} />
      <Route path="/studio" element={<StudioPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  );
}

function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleEnterHive = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      setIsAuthModalOpen(true);
    }
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Scroll tracking for Hero
  const { scrollYProgress: heroScroll } = useScroll();
  const scaleX = useSpring(heroScroll, { stiffness: 100, damping: 30, restDelta: 0.001 });
  
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);
  
  // Parallax effects for pro feel
  const y1 = useTransform(heroScroll, [0, 1], [0, -100]);
  const y2 = useTransform(heroScroll, [0, 1], [0, -50]);
  const opacity = useTransform(heroScroll, [0, 0.2], [1, 0]);

  // Handle hash navigation
  const location = useLocation();
  useEffect(() => {
    if (location.hash === "#price") {
      const el = document.getElementById("price");
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
        }, 500); // Small delay to ensure Lenis/GSAP are ready
      }
    }
  }, [location]);

  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-[#ffb300] selection:text-black cursor-none">
      {/* Noise Overlay for Pro Feel */}
      <div className="fixed inset-0 pointer-events-none z-[10000] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Custom Cursor */}
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
        animate={{
          x: mousePos.x - 6,
          y: mousePos.y - 6,
          scale: isHovering ? 3 : 1,
        }}
        transition={{ type: "spring", damping: 35, stiffness: 400, mass: 0.5 }}
      />

      {/* Progress Bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-1 bg-[#ffb300] z-[100] origin-left" style={{ scaleX }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full px-6 py-4 md:px-12 md:py-8 flex justify-between items-center z-[100] bg-[#050505]/40 backdrop-blur-md border-b border-white/5 text-white">
        <div 
          onClick={() => navigate("/")}
          className="flex items-center gap-3 md:gap-4 text-xl md:text-2xl font-bold tracking-tighter cursor-pointer group"
        >
          <div className="group-hover:scale-110 transition-transform duration-500">
            <Logo3D />
          </div>
          <span className="mt-1">HelpHive.</span>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)} 
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="p-2 md:p-3 hover:bg-white/10 rounded-full transition-colors group"
        >
          {isMenuOpen ? <X size={24} className="md:w-8 md:h-8" /> : <Menu size={24} className="md:w-8 md:h-8" />}
        </button>
      </nav>

      {/* Fullscreen Menu Overlay */}
      <motion.div
        initial={false}
        animate={isMenuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 bg-[#ffb300] text-white z-40 flex flex-col items-center justify-center gap-8 p-8"
      >
        {[
          { name: "HOME", path: "/" },
          { name: "PROTOCOL", path: "/protocol" },
          { name: "STUDIO", path: "/studio" },
          { name: "CONTACT", path: "/contact" }
        ].map((item, i) => (
          <motion.button
            key={item.name}
            initial={{ opacity: 0, y: 20 }}
            animate={isMenuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ delay: i * 0.1 }}
            className="text-6xl md:text-8xl font-bold tracking-tighter hover:italic transition-all uppercase"
            onClick={() => {
              setIsMenuOpen(false);
              if (item.path !== "#") navigate(item.path);
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {item.name}
          </motion.button>
        ))}
      </motion.div>

      {/* 1. Hero Section (Dark) */}
      <section className="relative min-h-screen bg-[#050505] text-white overflow-hidden flex flex-col lg:flex-row">
        {/* Left: Content Area */}
        <motion.div 
          style={{ y: y1, opacity }}
          className="relative w-full lg:w-1/2 min-h-[70vh] flex flex-col px-6 md:px-16 lg:px-24 xl:px-32 z-20 bg-[#050505] pt-28 md:pt-36 lg:pt-44 pb-20 justify-center"
        >
          <div className="max-w-2xl">
            <motion.h1 
              initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 1.8, ease: [0.19, 1, 0.22, 1] }}
              className="text-5xl md:text-7xl lg:text-8xl xl:text-[6.5rem] font-extrabold tracking-tight mb-6 leading-[0.95] drop-shadow-xl font-display"
            >
              Local <br />
              Intelligence. <br />
              <span className="text-[#ffb300]">Human Scale.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-base md:text-lg text-white/50 max-w-md mb-8 font-medium leading-relaxed"
            >
              A decentralized ecosystem for rapid coordination. Request help, trade assets, and discover opportunities—mapped to your immediate surroundings through our Neural Feed.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="grid gap-4 mb-10"
            >
              {[
                { label: "Decentralized.", text: "No middleman. Just the Hive." },
                { label: "Instant.", text: "Proximity-based routing for real-time results." },
                { label: "Verified.", text: "Reputation secured by the Honey Protocol." }
              ].map((prop, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1 h-1 rounded-full bg-[#ffb300] mt-2.5" />
                  <p className="text-xs md:text-sm leading-relaxed">
                    <span className="text-[#ffb300] font-bold mr-1">{prop.label}</span>
                    <span className="text-white/40">{prop.text}</span>
                  </p>
                </div>
              ))}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-6"
            >
              <button 
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={handleEnterHive}
                className="px-14 py-6 bg-[#ffb300] text-black font-black uppercase text-xs tracking-widest rounded-full hover:scale-105 transition-all duration-500 flex items-center justify-center gap-3 group shadow-2xl shadow-[#ffb300]/20"
              >
                {user ? "Go to Studio" : "Enter the Hive"}
                <ArrowUpRight className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" size={20} />
              </button>
              <button 
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={() => navigate("/protocol")}
                className="px-14 py-6 bg-white/5 backdrop-blur-2xl text-white font-black uppercase text-xs tracking-widest rounded-full border border-white/10 hover:bg-white/10 transition-all duration-500 text-center"
              >
                View the Protocol
              </button>
            </motion.div>
          </div>
        </motion.div>

        {/* Right: 3D Scene Area */}
        <motion.div 
          style={{ y: y2, opacity }}
          className="relative w-full lg:w-1/2 h-[50vh] lg:h-auto lg:min-h-screen z-10 bg-[#080808]"
        >
          {/* Refined gradient blend */}
          <div className="absolute inset-y-0 left-0 w-48 bg-gradient-to-r from-[#050505] via-[#050505]/80 to-transparent z-10 pointer-events-none hidden lg:block" />
          
          <div className="absolute inset-0">
            <Canvas dpr={[1, 2]} shadows={{ type: THREE.PCFShadowMap }}>
              <HeroScene scrollYProgress={heroScroll} setIsHovering={setIsHovering} />
            </Canvas>
          </div>

          <div className="absolute bottom-12 right-12 text-white/10 font-mono text-[9px] uppercase tracking-[0.6em] z-20 pointer-events-none flex items-center gap-6">
            <Plus size={10} className="text-[#ffb300]" /> CLICK MODELS TO RELEASE BEES <Plus size={10} className="text-[#ffb300]" />
          </div>
        </motion.div>
      </section>

      <KineticPulseSection onJoinMission={handleEnterHive} />
      <ProductionGradeSection />
      <Footer />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

