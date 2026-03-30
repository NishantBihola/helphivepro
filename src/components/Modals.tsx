import { motion, AnimatePresence } from "motion/react";
import { X, LogIn, UserPlus, Shield, Zap, Award, Globe, Package, MapPin, Send, Hexagon } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle } from "../firebase";
import { enhanceDescription } from "../services/gemini";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onClose();
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Sign in failed", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ffb300] to-transparent" />
            
            <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-[#ffb300]/10 flex items-center justify-center text-[#ffb300] mx-auto">
                <Shield size={40} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter">Initialize_Protocol</h2>
                <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Access the Neural Network</p>
              </div>

              <p className="text-white/60 text-sm leading-relaxed">
                To enter the Hive, you must verify your identity. This secures your reputation and enables hyper-local coordination.
              </p>

              <div className="space-y-4 pt-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full py-5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} />
                      Sign in with Google
                    </>
                  )}
                </button>
                
                <p className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
                  By connecting, you agree to the Honey_Protocol_v2.1
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface StudioItem {
  type: string;
  msg: string;
  time: string;
  location: string;
  price?: string;
  category: string;
}

interface StudioDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: StudioItem | null;
}

export function StudioDetailModal({ isOpen, onClose, item }: StudioDetailModalProps) {
  const [enhancedDesc, setEnhancedDesc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      const fetchEnhancement = async () => {
        setIsLoading(true);
        const desc = await enhanceDescription(item.msg, item.category);
        setEnhancedDesc(desc);
        setIsLoading(false);
      };
      fetchEnhancement();
    } else {
      setEnhancedDesc(null);
    }
  }, [isOpen, item]);

  if (!item) return null;

  const imageUrl = `https://picsum.photos/seed/${item.msg.replace(/\s/g, '')}/1200/800?grayscale`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-2xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-6xl bg-[#0a0a0a] border border-white/5 rounded-[48px] overflow-hidden flex flex-col lg:flex-row shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            {/* Image Section */}
            <div className="w-full lg:w-1/2 h-[300px] lg:h-auto relative group">
              <img 
                src={imageUrl} 
                alt={item.msg} 
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-1000 grayscale" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#0a0a0a]" />
              
              <div className="absolute top-10 left-10">
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="px-6 py-2.5 bg-[#ffb300] text-black font-black text-[11px] uppercase tracking-[0.3em] rounded-full shadow-xl shadow-[#ffb300]/20"
                >
                  {item.type}
                </motion.div>
              </div>

              {/* Decorative Hexagon */}
              <Hexagon className="absolute -bottom-12 -left-12 text-white/[0.03] w-48 h-48 rotate-12" />
            </div>

            {/* Content Section */}
            <div className="w-full lg:w-1/2 p-10 md:p-20 space-y-12 relative flex flex-col justify-center">
              <button 
                onClick={onClose} 
                className="absolute top-10 right-10 p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-full transition-all duration-300"
              >
                <X size={24} />
              </button>

              <div className="space-y-6">
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-3 text-[#ffb300]"
                >
                  <MapPin size={18} />
                  <span className="font-mono text-[11px] uppercase tracking-[0.4em] font-black">{item.location}</span>
                </motion.div>
                
                <motion.h2 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9]"
                >
                  {item.msg}
                </motion.h2>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-6 text-white/30 font-mono text-[10px] uppercase tracking-[0.3em] font-bold"
                >
                  <div className="flex items-center gap-2">
                    <Package size={14} />
                    <span>Category: {item.category}</span>
                  </div>
                  <span className="opacity-20">•</span>
                  <span>{item.time}</span>
                </motion.div>
              </div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="space-y-6 p-8 rounded-3xl bg-white/[0.02] border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-[#ffb300]" />
                  <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#ffb300] font-black">AI_Enhanced_Description</span>
                </div>
                
                <div className="min-h-[100px]">
                  {isLoading ? (
                    <div className="space-y-3">
                      <div className="h-3 bg-white/5 rounded-full animate-pulse w-full" />
                      <div className="h-3 bg-white/5 rounded-full animate-pulse w-3/4" />
                      <div className="h-3 bg-white/5 rounded-full animate-pulse w-5/6" />
                    </div>
                  ) : (
                    <p className="text-white/60 leading-relaxed text-sm md:text-base font-medium">
                      {enhancedDesc || "Scanning Hive for detailed specifications... Connection established. This request is verified within the local node."}
                    </p>
                  )}
                </div>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-10 border-t border-white/5"
              >
                <div className="text-center sm:text-left">
                  <span className="block text-[10px] font-mono uppercase tracking-[0.4em] text-white/20 mb-2 font-bold">Exchange_Value</span>
                  <span className="text-4xl font-black text-[#ffb300] tracking-tighter">{item.price || "Free"}</span>
                </div>
                
                <button className="group w-full sm:w-auto px-12 py-6 bg-[#ffb300] text-black font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all duration-500 flex items-center justify-center gap-4 shadow-2xl shadow-[#ffb300]/20">
                  Request_Access
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
