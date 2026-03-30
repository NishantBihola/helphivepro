import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef, Suspense } from "react";
import { ArrowLeft, Send, Mail, MapPin, Phone, Github, Twitter, Instagram, Linkedin, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Stars, PerspectiveCamera, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// --- 3D Background Component ---

function ContactPulse() {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <mesh>
          <sphereGeometry args={[2, 64, 64]} />
          <meshStandardMaterial 
            color="#ffb300" 
            wireframe 
            transparent 
            opacity={0.05} 
          />
        </mesh>
      </Float>
      
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Float key={i} speed={1 + Math.random()} rotationIntensity={2} floatIntensity={2} position={[
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ]}>
          <mesh>
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial color="#ffb300" transparent opacity={0.2} />
          </mesh>
        </Float>
      ))}
    </group>
  );
}

function ContactScene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 10]} fov={50} />
      <ambientLight intensity={0.2} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      <Suspense fallback={null}>
        <ContactPulse />
        <Environment preset="night" />
      </Suspense>
    </>
  );
}

// --- UI Components ---

const InputField = ({ label, type = "text", placeholder, name }: { label: string, type?: string, placeholder: string, name: string }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40 font-bold block ml-1">
      {label}
    </label>
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#ffb300]/50 focus:bg-white/[0.05] transition-all duration-300"
    />
  </div>
);

const TextAreaField = ({ label, placeholder, name }: { label: string, placeholder: string, name: string }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/40 font-bold block ml-1">
      {label}
    </label>
    <textarea
      name={name}
      placeholder={placeholder}
      rows={4}
      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-[#ffb300]/50 focus:bg-white/[0.05] transition-all duration-300 resize-none"
    />
  </div>
);

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 5000);
  };

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
        }}
        transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.5 }}
      >
        <div className="w-1 h-1 bg-[#ffb300] rounded-full" />
      </motion.div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-[100] px-8 py-10 flex justify-between items-center mix-blend-difference">
        <Link to="/" className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-[#ffb300] group-hover:text-black transition-all duration-500 group-hover:scale-110">
            <ArrowLeft size={20} />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.5em] font-bold opacity-50 group-hover:opacity-100 transition-opacity">Return_Home</span>
        </Link>
        <div className="flex flex-col items-end">
          <span className="text-[#ffb300] font-mono text-[10px] uppercase tracking-[0.5em] font-bold">Contact_Protocol</span>
          <span className="text-white/20 text-[8px] font-mono uppercase tracking-[0.3em] mt-1">Node_780_Active</span>
        </div>
      </nav>

      <main className="relative min-h-screen flex items-center justify-center pt-32 pb-20 px-6">
        {/* Background 3D Scene */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
          <Canvas>
            <ContactScene />
          </Canvas>
        </div>

        <div className="relative z-10 container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            {/* Left Side: Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-12"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-[1px] bg-[#ffb300]/50" />
                  <span className="text-[#ffb300] font-mono text-[10px] uppercase tracking-[0.6em] font-bold">Get in Touch</span>
                </div>
                <h1 className="text-[clamp(3rem,8vw,6rem)] font-bold tracking-tighter leading-[0.85]">
                  Let's <br />
                  <span className="text-[#ffb300] italic">Connect.</span>
                </h1>
                <p className="text-xl text-white/50 leading-relaxed max-w-md font-medium">
                  Have a question about the Hive? Want to integrate your community league? Or just want to say hi? We're always listening.
                </p>
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-[#ffb300] group-hover:bg-[#ffb300] group-hover:text-black transition-all duration-500">
                    <Mail size={24} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-1">Email_Us</span>
                    <span className="text-lg font-bold">hello@helphive.ca</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 group">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-[#ffb300] group-hover:bg-[#ffb300] group-hover:text-black transition-all duration-500">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-1">Base_Operations</span>
                    <span className="text-lg font-bold">Edmonton, AB (Node 780)</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {[Twitter, Instagram, Github, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:bg-[#ffb300] hover:text-black hover:scale-110 transition-all duration-500"
                  >
                    <Icon size={20} />
                  </a>
                ))}
              </div>
            </motion.div>

            {/* Right Side: Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="relative"
            >
              <div className="p-8 md:p-12 rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#ffb300]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <AnimatePresence mode="wait">
                  {!isSubmitted ? (
                    <motion.form
                      key="form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, y: -20 }}
                      onSubmit={handleSubmit}
                      className="space-y-8 relative z-10"
                    >
                      <div className="grid md:grid-cols-2 gap-8">
                        <InputField label="Full_Name" name="name" placeholder="John Doe" />
                        <InputField label="Email_Address" name="email" type="email" placeholder="john@example.com" />
                      </div>
                      <InputField label="Subject" name="subject" placeholder="General Inquiry" />
                      <TextAreaField label="Your_Message" name="message" placeholder="How can the Hive help you today?" />
                      
                      <button
                        type="submit"
                        className="w-full py-6 bg-[#ffb300] text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-3 shadow-2xl shadow-[#ffb300]/20"
                      >
                        <span>Send_Message</span>
                        <Send size={18} />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-20 space-y-6 relative z-10"
                    >
                      <div className="w-20 h-20 rounded-full bg-[#ffb300] text-black flex items-center justify-center mx-auto shadow-2xl shadow-[#ffb300]/40">
                        <Plus size={40} className="rotate-45" />
                      </div>
                      <h3 className="text-3xl font-bold tracking-tighter">Message_Sent!</h3>
                      <p className="text-white/50 max-w-xs mx-auto">
                        Your transmission has been received by the Hive. A node will respond shortly.
                      </p>
                      <button
                        onClick={() => setIsSubmitted(false)}
                        className="text-[#ffb300] font-mono text-[10px] uppercase tracking-[0.4em] font-bold hover:underline"
                      >
                        Send_Another_Transmission
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#ffb300]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#ffb300]/10 rounded-full blur-3xl pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer Micro-Copy */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none hidden md:block">
        <div className="flex items-center gap-4 text-white/20 font-mono text-[8px] uppercase tracking-[0.5em]">
          <span>HelpHive_Contact_Module_v1.0</span>
          <div className="w-1 h-1 rounded-full bg-white/20" />
          <span>Secured_Connection_Active</span>
        </div>
      </footer>
    </div>
  );
}
