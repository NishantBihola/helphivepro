import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from "react";
import { ArrowLeft, Shield, Zap, Award, Globe, Plus, Hexagon, Cpu, Lock, Activity, ChevronUp, Terminal, Map as MapIcon, Wind, Package, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Stars, Points, PointMaterial, PerspectiveCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AuthModal, StudioDetailModal } from "../components/Modals";
import { useAuth } from "../firebase";

gsap.registerPlugin(ScrollTrigger);

// --- 3D Edmonton Neural Mesh Component ---

function PulseRing({ activeNode, i }: { activeNode: number, i: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current && activeNode === i) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      ringRef.current.scale.set(s, s, s);
    }
    if (ringRef2.current && activeNode === i) {
      const s = 1.3 + Math.sin(state.clock.elapsedTime * 3 + 0.5) * 0.4;
      ringRef2.current.scale.set(s, s, s);
      const mat = ringRef2.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 * (1 - (s - 0.9) / 0.8);
    }
  });

  if (activeNode !== i) return null;

  return (
    <>
      <pointLight color="#ffb300" intensity={15} distance={6} />
      <mesh ref={ringRef}>
        <ringGeometry args={[0.4, 0.48, 64]} />
        <meshBasicMaterial color="#ffb300" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ringRef2}>
        <ringGeometry args={[0.5, 0.58, 64]} />
        <meshBasicMaterial color="#ffb300" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

function NeuralCityGrid({ activeNode }: { activeNode: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  // Generate city-like grid data
  const { points, lineGeometry } = useMemo(() => {
    const p = [];
    const linePoints = [];
    const size = 16;
    const divisions = 32;
    
    for (let i = 0; i <= divisions; i++) {
      for (let j = 0; j <= divisions; j++) {
        const x = (i / divisions - 0.5) * size;
        const z = (j / divisions - 0.5) * size;
        
        // River Valley elevation - more pronounced
        const distFromRiver = Math.abs(z - Math.sin(x * 0.3) * 3);
        const y = Math.exp(-distFromRiver * 0.4) * 2.5 - 1;
        
        p.push(x, y, z);

        // Grid lines
        if (i < divisions) {
          const nextX = ((i + 1) / divisions - 0.5) * size;
          const nextY = Math.exp(-Math.abs(z - Math.sin(nextX * 0.3) * 3) * 0.4) * 2.5 - 1;
          linePoints.push(x, y, z, nextX, nextY, z);
        }
        if (j < divisions) {
          const nextZ = ((j + 1) / divisions - 0.5) * size;
          const nextY = Math.exp(-Math.abs(nextZ - Math.sin(x * 0.3) * 3) * 0.4) * 2.5 - 1;
          linePoints.push(x, y, z, x, nextY, nextZ);
        }
      }
    }
    
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePoints, 3));
    
    return { 
      points: new THREE.Float32BufferAttribute(p, 3), 
      lineGeometry: lineGeo
    };
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.05) * 0.15;
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.05) * 0.08;
    }
    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.4 + Math.sin(state.clock.elapsedTime * 1.5) * 0.15;
    }
  });

  const nodes = [
    { pos: [0, 1.5, 0], label: "Downtown", color: "#ffb300" },
    { pos: [5, 0.2, 5], label: "Henday East", color: "#ffb300" },
    { pos: [-5, 0.4, -4], label: "West Ed", color: "#ffb300" },
    { pos: [2, 1.0, -5], label: "Old Strathcona", color: "#ffb300" },
    { pos: [-3, 0.8, 4], label: "North Side", color: "#ffb300" }
  ];

  const scale = Math.min(viewport.width / 10, 1.2);

  return (
    <group ref={groupRef} scale={scale}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" {...points} />
        </bufferGeometry>
        <pointsMaterial size={0.04} color="#ffb300" transparent opacity={0.5} sizeAttenuation />
      </points>
      
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#ffb300" transparent opacity={0.15} />
      </lineSegments>

      {nodes.map((node, i) => (
        <group key={i} position={node.pos as [number, number, number]}>
          <Float speed={4} rotationIntensity={1.5} floatIntensity={2}>
            <mesh>
              <sphereGeometry args={[activeNode === i ? 0.3 : 0.1, 32, 32]} />
              <meshStandardMaterial 
                color="#ffb300" 
                emissive="#ffb300" 
                emissiveIntensity={activeNode === i ? 8 : 1}
                transparent
                opacity={activeNode === i ? 1 : 0.5}
              />
            </mesh>
            <PulseRing activeNode={activeNode} i={i} />
          </Float>
        </group>
      ))}
    </group>
  );
}

function MapScene({ activeNode }: { activeNode: number }) {
  const { viewport } = useThree();
  const isMobile = viewport.width < 5;

  return (
    <>
      <PerspectiveCamera makeDefault position={isMobile ? [0, 15, 0] : [10, 10, 10]} fov={isMobile ? 45 : 35} />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      <ambientLight intensity={0.2} />
      <spotLight position={[15, 20, 15]} angle={0.2} penumbra={1} intensity={3} castShadow />
      <Stars radius={120} depth={60} count={3000} factor={6} saturation={0} fade speed={1.5} />
      <Suspense fallback={null}>
        <NeuralCityGrid activeNode={activeNode} />
        <Environment preset="night" />
      </Suspense>
    </>
  );
}

// --- UI Components ---

// Removed SystemTerminal and LivePulse as requested

// --- Main Studio Page ---

const modules = [
  {
    id: 0,
    label: "ENV_CONDITION_LOGIC_v2.0",
    title: "The Winter-Proof Protocol",
    copy: "Edmonton doesn’t stop for the cold, and neither does the Hive. Our Climate-Aware Routing prioritizes urgent requests when the mercury drops. Whether it’s a furnace failure in Terwillegar or a vehicle boost in Oliver, the Hive identifies critical needs during the deep freeze and pins them to every neighbor's radar.",
    feature: "Real-time temperature-triggered feed prioritization.",
    icon: Wind
  },
  {
    id: 1,
    label: "SPATIAL_ROUTING_NODE_780",
    title: "Hyper-Local Logistics",
    copy: "The Henday shouldn’t be a barrier to community. We’ve engineered a Neighborhood Radius Engine that calculates true travel time across the city’s major arteries. By matching you with \"Hivers\" based on transit flow rather than just a straight line, we ensure that \"just around the corner\" means exactly that—whether you're in Windermere or Griesbach.",
    feature: "Traffic-aware proximity matching.",
    icon: MapIcon
  },
  {
    id: 2,
    label: "ASSET_SHARING_PROTOCOL",
    title: "The Borrow-Lend Ledger",
    copy: "Why buy when you can borrow? Our Studio developed a Physical Asset Ledger for the sharing economy. From heavy-duty power tools for a weekend project to camping gear for the Rockies, we’ve created a secure, identity-verified system for Edmontonians to share resources, reducing waste and building real-world trust.",
    feature: "Automated inventory tracking and safety deposits.",
    icon: Package
  },
  {
    id: 3,
    label: "SOCIAL_GRAPH_VERIFICATION",
    title: "Community League Integration",
    copy: "We respect the legacy of Edmonton’s community leagues. HelpHive integrates with local residential associations to verify \"Active Neighbor\" status. This layer of Vouched Identity ensures that when you open your door, you’re greeting a verified member of your own block.",
    feature: "ZK-Proof residency verification.",
    icon: Users
  }
];

export default function StudioPage() {
  const [activeNode, setActiveNode] = useState(0);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { scrollYProgress } = useScroll();
  const smoothScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleEnterNetwork = (e: React.MouseEvent) => {
    if (user) {
      navigate("/dashboard");
    } else {
      e.preventDefault();
      setIsAuthModalOpen(true);
    }
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      modules.forEach((_, i) => {
        ScrollTrigger.create({
          trigger: `.module-card-${i}`,
          start: "top center",
          end: "bottom center",
          onEnter: () => setActiveNode(i),
          onEnterBack: () => setActiveNode(i),
        });
      });

      // Smooth parallax for the map container
      gsap.to(".map-container", {
        y: -50,
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true
        }
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-[#ffb300] selection:text-black overflow-x-hidden cursor-none">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[10000] opacity-[0.04] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Custom Cursor */}
      <motion.div
        className="fixed top-0 left-0 w-5 h-5 border border-white/20 rounded-full pointer-events-none z-[9999] mix-blend-difference flex items-center justify-center"
        animate={{
          x: mousePos.x - 10,
          y: mousePos.y - 10,
          scale: 1,
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.5 }}
      >
        <div className="w-1 h-1 bg-[#ffb300] rounded-full" />
      </motion.div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-8 py-6 md:py-10 flex justify-between items-center mix-blend-difference">
        <Link to="/" className="flex items-center gap-2 md:gap-4 group">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-[#ffb300] group-hover:text-black transition-all duration-500 group-hover:scale-110">
            <ArrowLeft size={18} />
          </div>
          <span className="font-mono text-[8px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.5em] font-bold opacity-50 group-hover:opacity-100 transition-opacity">Return_Home</span>
        </Link>
        <div className="flex flex-col items-end">
          <span className="text-[#ffb300] font-mono text-[8px] md:text-[10px] uppercase tracking-[0.3em] md:tracking-[0.5em] font-bold">Studio_Protocol</span>
          <span className="text-white/20 text-[7px] md:text-[8px] font-mono uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1">Node_780_Active</span>
        </div>
      </nav>

      <main ref={containerRef} className="relative">
        {/* Background 3D Scene - Full Screen Fixed */}
        <div className="fixed inset-0 z-0 map-container pointer-events-none opacity-60 md:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] z-10" />
          <Canvas shadows dpr={[1, 2]}>
            <MapScene activeNode={activeNode} />
          </Canvas>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 container mx-auto px-4 md:px-12 lg:px-24">
          {/* Hero Section */}
          <section className="min-h-screen flex flex-col justify-center pt-20 md:pt-32">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl"
            >
              <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="w-8 md:w-12 h-[1px] bg-[#ffb300]/50" />
                <span className="text-[#ffb300] font-mono text-[8px] md:text-[10px] uppercase tracking-[0.4em] md:tracking-[0.6em] font-bold">The Edmonton Foundry</span>
              </div>
              <h1 className="text-[clamp(2.5rem,12vw,10rem)] font-bold tracking-tighter leading-[0.85] mb-8 md:mb-12">
                The <br />
                <span className="text-[#ffb300] italic">Studio.</span>
              </h1>
              <p className="text-lg md:text-2xl text-white/50 leading-relaxed max-w-2xl font-medium">
                Engineering local resilience. From the River Valley to the Henday—we’ve mapped the city’s heartbeat.
              </p>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="mt-16 flex items-center gap-4 text-white/20 font-mono text-[8px] uppercase tracking-[0.5em]"
              >
                <div className="w-1 h-1 rounded-full bg-[#ffb300] animate-pulse" />
                <span>Scroll_To_Explore</span>
              </motion.div>
            </motion.div>
          </section>

          {/* Module Sections - Centered with Parallax */}
          <div className="space-y-[15vh] md:space-y-[30vh] pb-[20vh] md:pb-[30vh]">
            {modules.map((module, i) => (
              <section key={i} className={`module-card-${i} min-h-[70vh] md:min-h-screen flex items-center justify-center ${i % 2 === 0 ? 'lg:justify-start' : 'lg:justify-end'}`}>
                <motion.div
                  initial={{ opacity: 0, y: 60 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: false, margin: "-15%" }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="max-w-xl w-full p-6 md:p-16 rounded-[30px] md:rounded-[40px] border border-white/5 bg-black/70 backdrop-blur-3xl relative group mx-2 md:mx-0"
                >
                  <div className="absolute -top-4 -left-4 md:-top-6 md:-left-6 w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[#ffb300] text-black flex items-center justify-center shadow-2xl shadow-[#ffb300]/20 group-hover:scale-110 transition-transform duration-500">
                    <module.icon size={20} className="md:w-6 md:h-6" />
                  </div>
                  
                  <div className="space-y-6 md:space-y-8">
                    <span className="font-mono text-[8px] md:text-[9px] uppercase tracking-[0.3em] md:tracking-[0.4em] text-[#ffb300] font-bold">
                      {module.label}
                    </span>

                    <h2 className="text-3xl md:text-6xl font-bold tracking-tighter leading-tight">
                      {module.title}
                    </h2>

                    <p className="text-base md:text-lg text-white/50 leading-relaxed">
                      {module.copy}
                    </p>

                    <div className="pt-6 md:pt-8 border-t border-white/5 flex flex-col gap-3 md:gap-4">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-[#ffb300]" />
                        <span className="font-mono text-[7px] md:text-[8px] uppercase tracking-[0.2em] text-white/30">AI_Feature_Deployment</span>
                      </div>
                      <span className="text-xs md:text-sm font-bold text-white/80 group-hover:text-[#ffb300] transition-colors duration-300">{module.feature}</span>
                    </div>
                  </div>
                </motion.div>
              </section>
            ))}
          </div>

          {/* Final CTA */}
          <section className="min-h-screen flex flex-col justify-center items-center py-20 md:py-32">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative w-full max-w-5xl p-8 md:p-32 rounded-[40px] md:rounded-[60px] border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-3xl text-center overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[#ffb300]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <h3 className="text-4xl md:text-8xl font-bold mb-10 md:mb-16 tracking-tighter leading-none">
                Build the <br />
                <span className="text-[#ffb300] italic">Future Hive.</span>
              </h3>
              
              <div className="flex flex-col items-center gap-6 md:gap-8">
                <button 
                  onClick={handleEnterNetwork}
                  className="group relative inline-flex items-center gap-6 md:gap-12 px-10 md:px-16 py-6 md:py-8 bg-[#ffb300] text-black rounded-full font-black uppercase text-xs md:text-sm tracking-[0.2em] md:tracking-[0.3em] hover:scale-105 active:scale-95 transition-all duration-500 shadow-[0_0_50px_rgba(255,179,0,0.3)]"
                >
                  <span className="relative z-10">{user ? "ENTER_DASHBOARD" : "ENTER_NETWORK"}</span>
                  <Plus size={20} className="md:w-6 md:h-6 relative z-10 group-hover:rotate-90 transition-transform duration-500" />
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                </button>
                
                {!user && (
                  <p className="text-[8px] md:text-[10px] font-mono text-white/30 uppercase tracking-[0.3em] md:tracking-[0.4em]">
                    Authentication Required for Node Access
                  </p>
                )}
              </div>

              <Hexagon className="absolute -right-10 -bottom-10 md:-right-20 md:-bottom-20 text-white/[0.02] w-64 h-64 md:w-96 md:h-96 rotate-12 group-hover:rotate-45 transition-transform duration-[3s]" />
            </motion.div>
          </section>
        </div>
      </main>

      {/* Persistent UI Elements */}
      {/* Removed SystemTerminal and LivePulse as requested */}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <StudioDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} item={selectedItem} />

      {/* Scroll Progress - Vertical Right */}
      <div className="fixed right-2 md:right-4 top-1/2 -translate-y-1/2 h-32 md:h-48 w-[1px] bg-white/10 z-[100]">
        <motion.div
          className="w-full bg-[#ffb300] origin-top"
          style={{ height: "100%", scaleY: smoothScroll }}
        />
      </div>
    </div>
  );
}
