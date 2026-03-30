import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "motion/react";
import { ArrowLeft, Shield, Zap, Award, Globe, Plus, Hexagon, Cpu, Lock, Activity, ChevronUp, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState, useRef, Suspense, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Stars, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// --- 3D Data Stream / Particles ---
function DataParticles() {
  const points = useMemo(() => {
    const p = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      p[i * 3] = (Math.random() - 0.5) * 20;
      p[i * 3 + 1] = (Math.random() - 0.5) * 20;
      p[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return p;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05;
      ref.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={points} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffb300"
        size={0.02}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.2}
      />
    </Points>
  );
}

// --- 3D Hexagon Component ---
function HexagonCore({ scrollProgress }: { scrollProgress: any }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      meshRef.current.rotation.x += delta * 0.1;
      const scrollSpeed = scrollProgress.get() * 5;
      meshRef.current.rotation.y += delta * scrollSpeed;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <cylinderGeometry args={[2, 2, 0.5, 6, 1, true]} />
        <meshBasicMaterial color="#ffb300" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[1]} />
        <meshBasicMaterial color="#ffb300" wireframe transparent opacity={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 6]} />
        <meshBasicMaterial color="#ffb300" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// --- Glitch Text Component ---
function GlitchText({ text, className, isHovered }: { text: string; className?: string; isHovered?: boolean }) {
  const [displayText, setDisplayText] = useState(text);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";
  const intervalRef = useRef<any>(null);

  const startGlitch = useCallback(() => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      setDisplayText(prev => 
        text.split("").map((char, index) => {
          if (index < iteration) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        }).join("")
      );
      
      if (iteration >= text.length) clearInterval(intervalRef.current);
      iteration += 1 / 3;
    }, 30);
  }, [text]);

  useEffect(() => {
    if (isHovered) startGlitch();
    else setDisplayText(text);
  }, [isHovered, startGlitch, text]);

  return (
    <span className={`cursor-default ${className}`}>
      {displayText}
    </span>
  );
}

// --- Protocol Section Component ---
function ProtocolSection({ 
  index, 
  title, 
  content, 
  icon: Icon, 
  side,
  setIsHovering
}: { 
  index: number; 
  title: string; 
  content: string; 
  icon: any; 
  side: 'left' | 'right';
  setIsHovering: (val: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (lineRef.current) {
      const length = lineRef.current.getTotalLength();
      gsap.set(lineRef.current, { strokeDasharray: length, strokeDashoffset: length });
      
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: "top 70%",
        onEnter: () => {
          gsap.to(lineRef.current, { strokeDashoffset: 0, duration: 1.5, ease: "power2.out" });
        },
        onLeaveBack: () => {
          gsap.to(lineRef.current, { strokeDashoffset: length, duration: 1, ease: "power2.in" });
        }
      });
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative flex items-center mb-40 ${side === 'right' ? 'justify-end' : 'justify-start'}`}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: -1 }}>
        <path
          ref={lineRef}
          d={side === 'left' 
            ? `M ${window.innerWidth / 2} 50 L ${window.innerWidth / 4} 50` 
            : `M ${window.innerWidth / 2} 50 L ${window.innerWidth * 0.75} 50`}
          stroke="#ffb300"
          strokeWidth="1"
          fill="none"
          className="opacity-30"
        />
      </svg>

      <motion.div
        initial={{ opacity: 0, x: side === 'left' ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: false, margin: "-100px" }}
        onMouseEnter={() => { setIsHovered(true); setIsHovering(true); }}
        onMouseLeave={() => { setIsHovered(false); setIsHovering(false); }}
        className={`max-w-md p-8 rounded-2xl border border-white/5 bg-black/40 backdrop-blur-xl transition-colors duration-500 ${isHovered ? 'border-[#ffb300]/30 bg-black/60' : ''} ${side === 'right' ? 'text-right' : 'text-left'}`}
      >
        <div className={`flex items-center gap-4 mb-6 ${side === 'right' ? 'flex-row-reverse' : ''}`}>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500 ${isHovered ? 'bg-[#ffb300] text-black scale-110' : 'bg-[#ffb300]/10 text-[#ffb300]'}`}>
            <Icon size={24} />
          </div>
          <span className="font-mono text-[10px] text-[#ffb300] tracking-[0.4em]">0{index + 1} // PROTOCOL_NODE</span>
        </div>
        
        <h3 className="text-2xl font-bold mb-4 tracking-tight">
          <GlitchText text={title} isHovered={isHovered} />
        </h3>
        <p className="text-white/50 leading-relaxed font-medium group-hover:text-white/80 transition-colors">
          {content}
        </p>
      </motion.div>
    </div>
  );
}

export default function ProtocolPage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { scrollYProgress } = useScroll();
  const springScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const cursorX = useSpring(0, { stiffness: 500, damping: 28, mass: 0.5 });
  const cursorY = useSpring(0, { stiffness: 500, damping: 28, mass: 0.5 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      setMousePos({ 
        x: (e.clientX / window.innerWidth - 0.5) * 20, 
        y: (e.clientY / window.innerHeight - 0.5) * 20 
      });
    };

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [cursorX, cursorY]);

  const protocolData = [
    {
      title: "The Neural Layer",
      icon: Zap,
      content: "Our Geofencing Engine doesn't just calculate distance; it maps community density. Using Variable Geofencing, the Hive expands and contracts its search radius based on real-time node activity, ensuring help is never out of reach."
    },
    {
      title: "The Proof of Helpful",
      icon: Award,
      content: "Reputation is earned, not bought. Every interaction mints a Soulbound Reputation Token. This non-transferable identity captures your history of helpfulness, creating a self-governing trust layer that scales with the community."
    },
    {
      title: "The Vision Guard",
      icon: Shield,
      content: "We protect the Hive. Our Edge-AI Moderation automatically blurs PII (Personally Identifiable Information) and filters bad actors before they enter your feed. Your data stays yours; your help stays local."
    },
    {
      title: "The Escrow Logic",
      icon: Lock,
      content: "Secure transactions via Agentic Smart Contracts. Funds are held in a secure vault and released only when both parties confirm the 'Handshake' via the HiveChat."
    }
  ];

  return (
    <div className="bg-[#050505] text-white min-h-screen font-sans selection:bg-[#ffb300] selection:text-black cursor-none overflow-x-hidden relative">
      {/* Grid Background with Parallax */}
      <motion.div 
        className="fixed inset-0 bg-grid-small pointer-events-none z-0"
        style={{ x: mousePos.x, y: mousePos.y }}
      />

      {/* Scanning Line Effect */}
      <motion.div 
        className="fixed left-0 right-0 h-[2px] bg-[#ffb300]/20 blur-[2px] z-50 pointer-events-none"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[10000] opacity-[0.03] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      {/* Custom Cursor */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 border border-white rounded-full pointer-events-none z-[9999] mix-blend-difference flex items-center justify-center"
        style={{ x: cursorX, y: cursorY, translateX: "-50%", translateY: "-50%" }}
        animate={{
          scale: isHovering ? 2.5 : 1,
          backgroundColor: isHovering ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0)",
        }}
      >
        <motion.div 
          className="w-1 h-1 bg-white rounded-full"
          animate={{ scale: isHovering ? 0 : 1 }}
        />
      </motion.div>

      {/* System Status Indicator */}
      <div className="fixed bottom-10 left-10 z-[100] flex items-center gap-3 bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/5">
        <div className="w-2 h-2 rounded-full bg-[#ffb300] animate-pulse shadow-[0_0_10px_#ffb300]" />
        <div className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">System Status: <span className="text-[#ffb300]">ONLINE</span></span>
          <span className="font-mono text-[8px] text-white/20 uppercase tracking-widest mt-1">Nodes: 42,891 // Latency: 14ms</span>
        </div>
      </div>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="fixed bottom-10 right-10 z-[100] w-12 h-12 rounded-full bg-[#ffb300] text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full p-6 md:p-10 flex justify-between items-center z-[100] mix-blend-difference">
        <div className="flex items-center gap-8">
          <Link 
            to="/" 
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="flex items-center gap-2 text-[#ffb300] font-bold tracking-tighter hover:scale-105 transition-transform group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-xs uppercase tracking-widest">Return_Home</span>
          </Link>
          <Link 
            to="/studio" 
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="flex items-center gap-2 text-white/40 hover:text-[#ffb300] font-bold tracking-tighter hover:scale-105 transition-transform group"
          >
            <span className="font-mono text-xs uppercase tracking-widest">The_Studio</span>
          </Link>
        </div>
        <div className="text-white/20 font-mono text-[10px] uppercase tracking-[0.4em] hidden md:block">Protocol v1.0.4 // GEOLOCATION_ACTIVE</div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-screen flex flex-col items-center justify-center text-center px-6 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-[1px] bg-[#ffb300]" />
            <span className="text-[#ffb300] font-mono text-[10px] uppercase tracking-[0.6em] font-bold">The Honey Protocol v1.0</span>
            <div className="w-12 h-[1px] bg-[#ffb300]" />
          </div>
          
          <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-8 leading-tight">
            Decentralized <span className="text-[#ffb300]">Trust.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white/40 font-mono uppercase tracking-[0.2em] max-w-3xl mx-auto">
            Verified localism. Engineered for human coordination.
          </p>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-10 flex flex-col items-center gap-2 opacity-20"
        >
          <span className="font-mono text-[8px] uppercase tracking-widest">Initialize_Scroll</span>
          <div className="w-[1px] h-12 bg-white" />
        </motion.div>
      </header>

      {/* 3D Core Container */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <Suspense fallback={null}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
              <HexagonCore scrollProgress={springScroll} />
            </Float>
            <DataParticles />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>

      {/* Protocol Content */}
      <main className="container mx-auto px-6 md:px-16 lg:px-24 relative z-10">
        <div className="py-32">
          {protocolData.map((item, i) => (
            <ProtocolSection 
              key={i}
              index={i}
              title={item.title}
              content={item.content}
              icon={item.icon}
              side={i % 2 === 0 ? 'left' : 'right'}
              setIsHovering={setIsHovering}
            />
          ))}
        </div>

        {/* Technical Specs Bento-ish Grid */}
        <div className="pb-40 grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="md:col-span-2 p-12 rounded-[40px] border border-[#ffb300]/20 bg-[#ffb300]/5 backdrop-blur-xl flex flex-col justify-between min-h-[300px] group transition-all duration-500 hover:border-[#ffb300]/50 hover:bg-[#ffb300]/10"
          >
            <div className="flex justify-between items-start">
              <Cpu className="text-[#ffb300]" size={40} />
              <span className="text-[#ffb300] font-mono text-[10px] uppercase tracking-widest">Core Architecture</span>
            </div>
            <div>
              <h3 className="text-3xl font-bold mb-4 tracking-tight">Decentralized Mesh Network</h3>
              <p className="text-white/60 leading-relaxed">The Hive operates on a peer-to-peer mesh network, ensuring resilience even when traditional infrastructure fails. Every node is a validator.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="p-12 rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-xl flex flex-col justify-between group transition-all duration-500 hover:border-white/30 hover:bg-white/10"
          >
            <Activity className="text-white/40 group-hover:text-[#ffb300] transition-colors" size={32} />
            <div>
              <h3 className="text-2xl font-bold mb-2 tracking-tight">v1.0.4_STABLE</h3>
              <p className="text-white/40 text-sm font-mono">Latest stable release deployed to mainnet. All systems nominal.</p>
            </div>
          </motion.div>
        </div>

        {/* Deployment Ready Terminal Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-40 p-8 rounded-3xl border border-white/5 bg-black/60 backdrop-blur-3xl font-mono text-xs text-white/40 overflow-hidden relative group"
        >
          <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
            <Terminal size={14} className="text-[#ffb300]" />
            <span className="uppercase tracking-widest">System_Console // Hive_Protocol_Logs</span>
          </div>
          <div className="space-y-2">
            <p className="text-[#ffb300] animate-pulse">{">"} INITIALIZING HONEY_PROTOCOL_V1.0.4...</p>
            <p>{">"} CONNECTING TO NEURAL_MESH_NETWORK... [OK]</p>
            <p>{">"} VERIFYING SOULBOUND_REPUTATION_LEDGER... [OK]</p>
            <p>{">"} ACTIVATING EDGE_AI_MODERATION_GUARD... [OK]</p>
            <p>{">"} SYNCING GEOLOCATION_ACTIVE_NODES... 42,891 FOUND</p>
            <p className="text-white/60">{">"} SYSTEM_READY: HIVE_PROTOCOL_DEPLOYED_SUCCESSFULLY</p>
          </div>
          <div className="absolute -right-20 -bottom-20 opacity-5 group-hover:opacity-10 transition-opacity duration-1000">
            <Hexagon size={300} className="text-[#ffb300]" />
          </div>
        </motion.div>
      </main>

      {/* Footer Decoration */}
      <div className="py-20 border-t border-white/5 text-center relative z-10 bg-black">
        <div className="flex justify-center items-center gap-12 text-white/10 font-mono text-[9px] uppercase tracking-[0.6em]">
          <Plus size={10} className="text-[#ffb300]" /> HONEY PROTOCOL <Plus size={10} className="text-[#ffb300]" /> SECURED BY HIVE <Plus size={10} className="text-[#ffb300]" />
        </div>
      </div>
    </div>
  );
}
