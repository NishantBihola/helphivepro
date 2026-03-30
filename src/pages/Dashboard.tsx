import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, 
  Search, 
  Bell, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Plus, 
  Zap, 
  Shield, 
  MapPin, 
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Users,
  Hexagon,
  X,
  Send
} from "lucide-react";
import { useAuth, db, handleFirestoreError, OperationType } from "../firebase";
import { useNavigate } from "react-router-dom";
import { collection, query, limit, onSnapshot, orderBy, doc, getDoc, getDocs, addDoc, updateDoc, increment, where, or, and, setDoc, deleteDoc } from "firebase/firestore";
import { askHive } from "../services/gemini";
import { createCheckoutSession, verifySession } from "../services/stripeService";

// AI Assistant Component
interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
}

const HiveAssistant = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: "welcome",
    role: "ai",
    text: "How can I help you strengthen the Hive today? Ask about local needs, reputation building, or neighborhood events."
  }]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAskAI = async () => {
    if (!prompt.trim()) return;
    
    const userMsgId = Date.now().toString();
    const newMessages: ChatMessage[] = [...messages, { id: userMsgId, role: "user", text: prompt }];
    setMessages(newMessages);
    setPrompt("");
    setLoading(true);
    
    try {
      const result = await askHive(prompt, user?.displayName || "a community member");
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: result || "I'm buzzing with ideas, but couldn't quite process that. Try again?"
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: "The neural link is a bit fuzzy. Check your connection."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-6 flex flex-col gap-4 shadow-xl h-full min-h-[400px]">
      <div className="flex items-center gap-3 text-[#ffb300] shrink-0">
        <Sparkles size={20} />
        <h3 className="text-sm font-bold uppercase tracking-widest">Hive_Assistant</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className="relative group max-w-[85%]">
              <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === "user" 
                  ? "bg-[#ffb300] text-black rounded-tr-sm" 
                  : "bg-white/10 text-white/80 rounded-tl-sm font-mono"
              }`}>
                <p>{msg.text}</p>
              </div>
              <button 
                onClick={() => deleteMessage(msg.id)}
                className={`absolute -top-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                  msg.role === "user" ? "-left-2" : "-right-2"
                }`}
                title="Delete message"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-white/10 text-white/80 p-3 rounded-2xl rounded-tl-sm text-xs font-mono flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#ffb300] rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-[#ffb300] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              <div className="w-1.5 h-1.5 bg-[#ffb300] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative shrink-0 mt-2">
        <input 
          type="text" 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
          placeholder="Ask the Hive..."
          className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 pr-10 text-xs text-white focus:border-[#ffb300]/50 outline-none transition-all"
        />
        <button 
          onClick={handleAskAI}
          disabled={loading || !prompt.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#ffb300] text-black rounded-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          <ArrowUpRight size={16} />
        </button>
      </div>
    </div>
  );
};

// Notification Dropdown Component
const NotificationDropdown = ({ notifications, onClose }: { notifications: any[]; onClose: () => void }) => {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden">
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#ffb300]">Notifications</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
      </div>
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        {notifications.length === 0 ? (
          <p className="p-4 text-xs text-white/40 italic text-center">No new notifications.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
              <p className="text-xs text-white/80 mb-1">
                <span className="font-bold">{n.senderName}</span> {n.type === 'like' ? 'liked your activity' : 'replied to your activity'}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-white/40 font-mono">{new Date(n.timestamp).toLocaleTimeString()}</span>
                <button onClick={() => markAsRead(n.id)} className="text-[10px] text-[#ffb300] hover:underline">Mark as read</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Edit Profile Modal Component
const EditProfileModal = ({ user, userData, onClose }: { user: any; userData: any; onClose: () => void }) => {
  const [displayName, setDisplayName] = useState(userData?.displayName || "");
  const [bio, setBio] = useState(userData?.bio || "");
  const [photoURL, setPhotoURL] = useState(userData?.photoURL || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const profileRef = doc(db, "public_profiles", user.uid);
      
      await updateDoc(userRef, { displayName, photoURL });
      await updateDoc(profileRef, { displayName, bio, photoURL });
      
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white">
          <X size={24} />
        </button>
        <h2 className="text-xl font-black tracking-tight uppercase italic mb-6">Edit_Profile</h2>
        <div className="space-y-4">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display Name"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ffb300]"
          />
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Bio"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ffb300] h-24"
          />
          <input
            type="text"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            placeholder="Photo URL"
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ffb300]"
          />
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-[#ffb300] text-black font-bold py-3 rounded-xl hover:bg-[#ffb300]/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// User Profile Modal Component
const UserProfileModal = ({ userId, onClose }: { userId: string; onClose: () => void }) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, "public_profiles", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfileData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchProfile();
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white">
          <Plus size={24} className="rotate-45" />
        </button>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-8 h-8 border-2 border-[#ffb300]/20 border-t-[#ffb300] rounded-full animate-spin" />
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Loading_Profile...</p>
          </div>
        ) : profileData ? (
          <div className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ffb300] to-[#ff8c00] p-[2px]">
                <div className="w-full h-full rounded-2xl bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                  {profileData.photoURL ? (
                    <img src={profileData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={32} className="text-[#ffb300]" />
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tighter italic">{profileData.name || "Anonymous"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Shield size={14} className="text-[#4ade80]" />
                  <span className="text-xs font-bold text-white/60">Level {profileData.reputation || 1}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2 text-[#ffb300]">
                  <Zap size={16} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Honey_Score</span>
                </div>
                <p className="text-2xl font-black">{profileData.honeyScore?.toLocaleString() || "100"}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2 text-[#60a5fa]">
                  <Users size={16} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Active_Helps</span>
                </div>
                <p className="text-2xl font-black">{profileData.activeHelps || "0"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Bio</h3>
              <p className="text-sm text-white/80 leading-relaxed">
                {profileData.bio || "This user hasn't added a bio yet. They are busy strengthening the Hive."}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-white/40 italic">Profile not found.</div>
        )}
      </motion.div>
    </div>
  );
};

// Create Post Modal Component
const CreatePostModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [type, setType] = useState<"NEED" | "OFFER">("NEED");
  const [msg, setMsg] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const { user } = useAuth();

  const handleEnhance = async () => {
    if (!msg.trim()) return;
    setAiEnhancing(true);
    try {
      const prompt = `Enhance this community ${type.toLowerCase()} post to be more engaging and clear. Keep it under 200 characters. Original: "${msg}"`;
      const enhanced = await askHive(prompt, user?.displayName || "Member");
      if (enhanced) setMsg(enhanced.replace(/["']/g, ''));
    } catch (error) {
      console.error("AI Enhance Error:", error);
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim() || !user) return;
    
    setLoading(true);
    try {
      let finalMsg = msg;
      if (aiMode) {
        setAiEnhancing(true);
        const prompt = `Enhance this community ${type.toLowerCase()} post to be more engaging and clear. Keep it under 200 characters. Original: "${msg}"`;
        const enhanced = await askHive(prompt, user?.displayName || "Member");
        if (enhanced) finalMsg = enhanced.replace(/["']/g, '');
        setAiEnhancing(false);
      }

      // 1. Create the activity post
      await addDoc(collection(db, "activities"), {
        type,
        msg: finalMsg,
        location: location || "Edmonton",
        timestamp: new Date().toISOString(),
        user: user.displayName || "Anonymous",
        uid: user.uid
      });

      // 2. Update user stats
      const userRef = doc(db, "users", user.uid);
      
      // Calculate rewards
      const honeyReward = type === "OFFER" ? 10 : 5;
      const repReward = type === "OFFER" ? 5 : 2;
      const activeHelpIncrement = type === "OFFER" ? 1 : 0;

      await updateDoc(userRef, {
        honeyScore: increment(honeyReward),
        reputation: increment(repReward),
        activeHelps: increment(activeHelpIncrement)
      });
      
      const publicProfileRef = doc(db, "public_profiles", user.uid);
      await updateDoc(publicProfileRef, {
        honeyScore: increment(honeyReward),
        reputation: increment(repReward),
        activeHelps: increment(activeHelpIncrement)
      });

      onClose();
      setMsg("");
      setLocation("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "activities");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white">
          <Plus size={24} className="rotate-45" />
        </button>
        
        <h2 className="text-2xl font-black tracking-tighter italic mb-6">Create_Post</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setType("NEED")}
              className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${
                type === "NEED" ? "bg-red-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              I Need Help
            </button>
            <button
              type="button"
              onClick={() => setType("OFFER")}
              className={`flex-1 py-3 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${
                type === "OFFER" ? "bg-green-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
              }`}
            >
              I Can Help
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Message</label>
              <button
                type="button"
                onClick={() => setAiMode(!aiMode)}
                className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${aiMode ? "text-[#ffb300]" : "text-white/40 hover:text-white"}`}
              >
                <Sparkles size={12} />
                {aiMode ? "AI Mode: ON" : "AI Mode: OFF"}
              </button>
            </div>
            <div className="relative">
              <textarea 
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder={`What do you ${type === "NEED" ? "need help with" : "want to offer"}?`}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white focus:border-[#ffb300]/50 outline-none transition-all min-h-[120px] resize-none"
                required
              />
              {!aiMode && (
                <button
                  type="button"
                  onClick={handleEnhance}
                  disabled={aiEnhancing || !msg.trim()}
                  className="absolute bottom-3 right-3 p-2 bg-white/5 hover:bg-[#ffb300]/20 text-[#ffb300] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Enhance with AI"
                >
                  {aiEnhancing ? <div className="w-4 h-4 border-2 border-[#ffb300]/20 border-t-[#ffb300] rounded-full animate-spin" /> : <Sparkles size={16} />}
                  <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">AI_Enhance</span>
                </button>
              )}
            </div>
            {aiMode && (
              <p className="text-[10px] text-[#ffb300]/60 italic mt-1">
                Your message will be automatically enhanced by the Hive AI before posting.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Location</label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                <input 
                  type="text" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Downtown, North Side"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white focus:border-[#ffb300]/50 outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    setLoading(true);
                    navigator.geolocation.getCurrentPosition(async (position) => {
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
                        const data = await res.json();
                        const city = data.address.city || data.address.town || data.address.village || data.address.suburb || "Unknown";
                        setLocation(city);
                      } catch (e) {
                        console.error("Geocoding error", e);
                      } finally {
                        setLoading(false);
                      }
                    }, () => {
                      setLoading(false);
                    });
                  }
                }}
                className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                title="Use Real Location"
              >
                <MapPin size={14} className="text-[#ffb300]" />
                <span className="hidden sm:block">Locate</span>
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || !msg.trim()}
            className="w-full py-4 bg-[#ffb300] text-black rounded-xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? "Processing..." : "Broadcast_To_Hive"}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// Discover Tab Component
const DiscoverTab = ({ user, setSelectedUserProfile, setActiveTab, setSelectedConversation }: any) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const q = query(collection(db, "public_profiles"), limit(50));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProfiles(docs.filter(p => p.id !== user.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "public_profiles");
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, [user]);

  const filteredProfiles = profiles.filter(p => 
    p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black tracking-tighter italic">
          Discover <span className="text-[#ffb300]">Hive</span>
        </h1>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#ffb300] transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#ffb300] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map(profile => (
            <div key={profile.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-[#0a0a0a] overflow-hidden border-2 border-[#ffb300]/20">
                  {profile.photoURL ? (
                    <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#ffb300]/10 text-[#ffb300] font-bold text-xl">
                      {profile.displayName?.charAt(0).toUpperCase() || "A"}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{profile.displayName || "Anonymous"}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <span className="flex items-center gap-1"><Zap size={12} className="text-[#ffb300]" /> {profile.honeyScore || 0}</span>
                    <span>•</span>
                    <span>Rep: {profile.reputation || 1}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-white/60 mb-6 line-clamp-2">
                {profile.bio || "A new member of the Hive."}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedUserProfile(profile.id)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold transition-colors"
                >
                  View Profile
                </button>
                <button 
                  onClick={() => {
                    setSelectedConversation(profile.id);
                    setActiveTab("messages");
                  }}
                  className="flex-1 py-2 rounded-xl bg-[#ffb300] text-black hover:bg-[#ffb300]/90 text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} /> Message
                </button>
              </div>
            </div>
          ))}
          {filteredProfiles.length === 0 && (
            <div className="col-span-full py-12 text-center text-white/40 italic">
              No members found.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Messages Tab Component
const MessagesTab = ({ messages, selectedConversation, setSelectedConversation, selectedActivity, user }: any) => {
  const [replyText, setReplyText] = useState("");
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group messages by conversation (other user's ID)
  const conversations = messages.reduce((acc: any, msg: any) => {
    const otherId = msg.senderId === user.uid ? msg.receiverId : msg.senderId;
    if (!acc[otherId]) {
      acc[otherId] = { messages: [], lastMessage: msg };
    }
    acc[otherId].messages.push(msg);
    if (new Date(msg.timestamp) > new Date(acc[otherId].lastMessage.timestamp)) {
      acc[otherId].lastMessage = msg;
    }
    return acc;
  }, {});

  // Fetch profiles for all conversation partners
  useEffect(() => {
    const fetchProfiles = async () => {
      const otherIds = Object.keys(conversations);
      if (selectedConversation && !otherIds.includes(selectedConversation)) {
        otherIds.push(selectedConversation);
      }
      
      const newProfiles = { ...profiles };
      let hasNew = false;
      
      for (const id of otherIds) {
        if (!newProfiles[id]) {
          try {
            const docSnap = await getDoc(doc(db, "public_profiles", id));
            if (docSnap.exists()) {
              newProfiles[id] = docSnap.data();
              hasNew = true;
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
          }
        }
      }
      
      if (hasNew) {
        setProfiles(newProfiles);
      }
    };
    
    fetchProfiles();
  }, [messages, selectedConversation]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation, messages]);

  const handleSend = async (receiverId: string, activityId: string) => {
    if (!replyText.trim()) return;
    try {
      await addDoc(collection(db, "messages"), {
        text: replyText,
        senderId: user.uid,
        receiverId,
        activityId: activityId || "direct",
        timestamp: new Date().toISOString(),
        read: false
      });

      // Create notification
      if (activityId) {
        await addDoc(collection(db, "notifications"), {
          userId: receiverId,
          type: "reply",
          activityId,
          senderId: user.uid,
          senderName: user.displayName || "Anonymous",
          read: false,
          timestamp: new Date().toISOString()
        });
      }

      setReplyText("");
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "messages");
    }
  };

  const markAsRead = async (msgId: string) => {
    try {
      await updateDoc(doc(db, "messages", msgId), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "messages");
    }
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, "messages", msgId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "messages");
    }
  };

  const clearChat = async () => {
    if (!selectedConversation || !user) return;
    
    // Query all messages between user and selectedConversation
    const q = query(
      collection(db, "messages"),
      or(
        and(where("senderId", "==", user.uid), where("receiverId", "==", selectedConversation)),
        and(where("senderId", "==", selectedConversation), where("receiverId", "==", user.uid))
      )
    );
    
    try {
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, "messages");
    }
  };

  const activeChat = selectedConversation ? conversations[selectedConversation] : null;
  const isNewConversation = selectedConversation && !activeChat && selectedActivity;
  const activeProfile = selectedConversation ? profiles[selectedConversation] : null;

  return (
    <div className="flex h-full bg-[#111] rounded-3xl border border-white/5 overflow-hidden flex-col md:flex-row">
      {/* Conversations List */}
      <div className={`w-full md:w-1/3 border-r border-white/5 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-black tracking-tight uppercase italic">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {Object.entries(conversations)
            .sort(([, a]: any, [, b]: any) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime())
            .map(([otherId, chat]: [string, any]) => {
            const isUnread = chat.messages.some((m: any) => m.receiverId === user.uid && !m.read);
            const profile = profiles[otherId];
            return (
              <button
                key={otherId}
                onClick={() => {
                  setSelectedConversation(otherId);
                  chat.messages.forEach((m: any) => {
                    if (m.receiverId === user.uid && !m.read) markAsRead(m.id);
                  });
                }}
                className={`w-full p-4 text-left border-b border-white/5 transition-colors flex items-center gap-4 ${
                  selectedConversation === otherId ? "bg-white/10" : "hover:bg-white/5"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#0a0a0a] overflow-hidden border border-white/10 flex-shrink-0">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ffb300] font-bold">
                      {(profile?.displayName || otherId).substring(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-sm truncate">{profile?.displayName || `User ${otherId.substring(0, 4)}`}</span>
                    <span className="text-[10px] text-white/40 font-mono flex-shrink-0 ml-2">
                      {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${isUnread ? "text-white font-bold" : "text-white/60"}`}>
                    {chat.lastMessage.senderId === user.uid ? "You: " : ""}{chat.lastMessage.text}
                  </p>
                </div>
                {isUnread && <div className="w-2 h-2 rounded-full bg-[#ffb300] flex-shrink-0" />}
              </button>
            );
          })}
          {Object.keys(conversations).length === 0 && !isNewConversation && (
            <div className="p-8 text-center text-white/40 text-sm italic">
              No conversations yet. Discover members to start chatting!
            </div>
          )}
        </div>
      </div>

      {/* Active Chat */}
      <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {activeChat || isNewConversation ? (
          <>
            <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4 bg-white/5">
              <div className="flex items-center gap-4">
                <button 
                  className="md:hidden p-2 -ml-2 text-white/60 hover:text-white"
                  onClick={() => setSelectedConversation(null)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-[#0a0a0a] overflow-hidden border border-white/10 flex-shrink-0">
                  {activeProfile?.photoURL ? (
                    <img src={activeProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ffb300] font-bold">
                      {(activeProfile?.displayName || selectedConversation)?.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold">{activeProfile?.displayName || `User ${selectedConversation?.substring(0, 4)}`}</h3>
                  <p className="text-[10px] text-white/40 font-mono">
                    {activeProfile?.bio || "Member of the Hive"}
                  </p>
                </div>
              </div>
              <button
                onClick={clearChat}
                className="text-xs font-bold text-red-500 hover:text-red-400 transition-colors"
              >
                Clear Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar flex flex-col">
              {isNewConversation && selectedActivity && (
                <div className="bg-[#ffb300]/10 border border-[#ffb300]/20 rounded-xl p-4 mb-6 self-center max-w-md w-full">
                  <p className="text-xs text-[#ffb300] font-bold mb-2 uppercase tracking-wider text-center">Replying to Activity</p>
                  <p className="text-sm text-white/80 italic text-center">"{selectedActivity.msg}"</p>
                </div>
              )}
              
              {activeChat ? activeChat.messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((msg: any) => {
                const isMine = msg.senderId === user.uid;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-3 relative shadow-sm ${
                      isMine ? "bg-[#ffb300] text-black rounded-br-none" : "bg-white/10 text-white rounded-bl-none"
                    }`}>
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className={`absolute -top-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 ${isMine ? "-left-2" : "-right-2"}`}
                        title="Delete message"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                      <p className={`text-[10px] mt-2 font-mono ${isMine ? "text-black/60" : "text-white/40"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              }) : null}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-white/5 bg-white/5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(selectedConversation!, activeChat ? activeChat.messages[0].activityId : selectedActivity?.id)}
                  placeholder="Type a message..."
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#ffb300] transition-colors"
                />
                <button
                  onClick={() => handleSend(selectedConversation!, activeChat ? activeChat.messages[0].activityId : selectedActivity?.id)}
                  disabled={!replyText.trim()}
                  className="p-3 rounded-xl bg-[#ffb300] text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#ffb300]/90 transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">Select a conversation</p>
            <p className="text-sm">Or discover new members to chat with</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("home");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState<"ALL" | "NEED" | "OFFER">("ALL");
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [unreadActivitiesCount, setUnreadActivitiesCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "notifications"), where("userId", "==", user.uid), where("read", "==", false));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(newNotifications);
        setUnreadNotificationsCount(newNotifications.length);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "notifications"));
      return unsubscribe;
    }
  }, [user]);

  useEffect(() => {
    if (activities.length > 0 && userData?.lastCheckedActivities) {
      const lastChecked = new Date(userData.lastCheckedActivities);
      const count = activities.filter(a => new Date(a.timestamp) > lastChecked).length;
      setUnreadActivitiesCount(count);
    } else if (activities.length > 0) {
      setUnreadActivitiesCount(activities.length);
    }
  }, [activities, userData]);

  useEffect(() => {
    if (activeTab === "home" && user) {
      const updateLastChecked = async () => {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            lastCheckedActivities: new Date().toISOString()
          });
          setUnreadActivitiesCount(0);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
        }
      };
      updateLastChecked();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const sessionId = urlParams.get("session_id");

    if (success === "true" && sessionId && user) {
      const handlePaymentSuccess = async () => {
        try {
          const session = await verifySession(sessionId);
          if (session.status === "paid") {
            await updateDoc(doc(db, "users", user.uid), {
              plan: session.planName,
            });
            // Optionally show a success message
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
        }
      };
      handlePaymentSuccess();
    }
  }, [user]);

  useEffect(() => {
    if (authLoading || !user) return;

    const path = "activities";
    const q = query(collection(db, path), orderBy("timestamp", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || !user) return;

    const path = "public_profiles";
    const q = query(collection(db, path), orderBy("honeyScore", "desc"), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc, index) => ({ id: doc.id, rank: index + 1, ...doc.data() }));
      setLeaderboard(docs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading || !user) return;

    const path = "messages";
    // Fetch messages where user is either sender or receiver
    const q1 = query(collection(db, path), where("receiverId", "==", user.uid));
    const q2 = query(collection(db, path), where("senderId", "==", user.uid));

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(prev => {
        const merged = [...prev.filter(m => m.receiverId !== user.uid), ...docs];
        return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
      setUnreadCount(docs.filter((d: any) => !d.read).length);
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(prev => {
        const merged = [...prev.filter(m => m.senderId !== user.uid), ...docs];
        return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }, (error) => handleFirestoreError(error, OperationType.GET, path));

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      const path = `users/${user.uid}`;
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            
            // Ensure public profile exists
            const publicProfileRef = doc(db, "public_profiles", user.uid);
            const publicProfileDoc = await getDoc(publicProfileRef);
            if (!publicProfileDoc.exists()) {
              await setDoc(publicProfileRef, {
                uid: user.uid,
                displayName: data.displayName || user.displayName || "Anonymous",
                photoURL: data.photoURL || user.photoURL || "",
                honeyScore: data.honeyScore || 100,
                activeHelps: data.activeHelps || 0,
                reputation: data.reputation || 1,
                bio: data.bio || "A new member of the Hive."
              }, { merge: true });
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      };
      fetchUserData();
    }
  }, [user]);

  const stats = [
    { label: "Honey_Score", value: userData?.honeyScore?.toLocaleString() || "100", icon: Zap, color: "#ffb300" },
    { label: "Reputation", value: `Level ${userData?.reputation || 1}`, icon: Shield, color: "#4ade80" },
    { label: "Active_Helps", value: (userData?.activeHelps || 0).toString(), icon: Users, color: "#60a5fa" },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#ffb300]/20 border-t-[#ffb300] rounded-full animate-spin" />
          <p className="text-[#ffb300] font-mono text-[10px] uppercase tracking-[0.4em] animate-pulse">Syncing_Neural_Link...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans selection:bg-[#ffb300] selection:text-black">
      {/* Sidebar */}
      <aside className="w-72 border-right border-white/5 bg-[#0d0d0d] flex flex-col p-8 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#ffb300] rounded-xl flex items-center justify-center">
            <Hexagon className="text-black fill-black" size={24} />
          </div>
          <span className="text-xl font-black tracking-tighter italic">HELPHIVE</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {[
            { id: "home", icon: LayoutDashboard, label: "Dashboard", badge: unreadActivitiesCount > 0 ? unreadActivitiesCount : null },
            { id: "discover", icon: Search, label: "Discover" },
            { id: "messages", icon: MessageSquare, label: "Messages", badge: unreadCount > 0 ? unreadCount : null },
            { id: "studio", icon: Zap, label: "Studio" },
            { id: "settings", icon: Settings, label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group ${
                activeTab === item.id ? "bg-[#ffb300] text-black" : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-4">
                <item.icon size={20} />
                <span className="text-sm font-bold tracking-wide">{item.label}</span>
              </div>
              {item.badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => logout()}
          className="flex items-center gap-4 px-4 py-3 text-white/40 hover:text-red-400 transition-colors mt-auto"
        >
          <LogOut size={20} />
          <span className="text-sm font-bold">Logout_Session</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-24 border-bottom border-white/5 flex items-center justify-between px-12 bg-[#0a0a0a]/80 backdrop-blur-xl z-50">
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 w-96">
            <Search size={18} className="text-white/20" />
            <input 
              type="text" 
              placeholder="Search the Edmonton Hive..." 
              className="bg-transparent border-none outline-none text-xs w-full"
            />
          </div>
          <button 
            onClick={async () => {
              const priceId = import.meta.env.VITE_STRIPE_PRICE_ID_QUEEN_PLAN;
              if (!priceId) {
                alert("Stripe Price ID is not configured.");
                return;
              }
              const url = await createCheckoutSession(priceId, user.uid, "Queen Plan");
              window.location.href = url;
            }}
            className="bg-[#ffb300] text-black px-6 py-2 rounded-xl text-xs font-bold hover:bg-[#ffb300]/80 transition-colors"
          >
            UPGRADE_PLAN
          </button>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                className="relative p-2 text-white/40 hover:text-white transition-colors"
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <div className="absolute top-1 right-1 bg-[#ffb300] text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-[#0a0a0a]">
                    {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                  </div>
                )}
              </button>
              {isNotificationDropdownOpen && (
                <NotificationDropdown notifications={notifications} onClose={() => setIsNotificationDropdownOpen(false)} />
              )}
            </div>
            
            <div className="flex items-center gap-4 pl-6 border-left border-white/10">
              <button onClick={() => setIsEditProfileModalOpen(true)} className="text-right hidden sm:block hover:opacity-80 transition-opacity">
                <p className="text-xs font-black tracking-tight">{user?.displayName || "Hive_Member"}</p>
                <div className="flex items-center justify-end gap-2">
                  <p className="text-[10px] text-white/40 font-mono uppercase">Edmonton_North</p>
                  {userData?.plan && (
                    <span className="text-[8px] font-bold bg-[#ffb300]/20 text-[#ffb300] px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                      {userData.plan}
                    </span>
                  )}
                </div>
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ffb300] to-[#ff8c00] p-[1px]">
                <div className="w-full h-full rounded-xl bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Users size={20} className="text-[#ffb300]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full">
            {activeTab === "messages" ? (
              <MessagesTab 
                messages={messages} 
                selectedConversation={selectedConversation} 
                setSelectedConversation={setSelectedConversation} 
                selectedActivity={selectedActivity}
                user={user} 
              />
            ) : activeTab === "discover" ? (
              <DiscoverTab 
                user={user}
                setSelectedUserProfile={setSelectedUserProfile}
                setActiveTab={setActiveTab}
                setSelectedConversation={setSelectedConversation}
              />
            ) : (
              <div className="space-y-12">
                {/* Welcome & Stats */}
                <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  <div className="xl:col-span-2 space-y-8">
                    <div className="space-y-2">
                      <h1 className="text-4xl font-black tracking-tighter italic">
                        Welcome back, <span className="text-[#ffb300]">{user?.displayName?.split(' ')[0] || "Member"}</span>.
                      </h1>
                      <p className="text-white/40 text-sm max-w-lg">
                        The Edmonton Hive is active. There are <span className="text-white">{activities.filter(a => a.type === 'NEED').length} new needs</span> in your immediate neighborhood.
                      </p>
                    </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.map((stat, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-[#111] border border-white/5 rounded-3xl p-6 group hover:border-[#ffb300]/30 transition-all duration-500"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-white/5 group-hover:bg-[#ffb300]/10 transition-colors">
                          <stat.icon style={{ color: stat.color }} size={24} />
                        </div>
                        <TrendingUp size={16} className="text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className="text-2xl font-black tracking-tight">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <HiveAssistant />
              </div>
            </section>

            {/* Neural Feed & Quick Actions */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-12">
              <div className="xl:col-span-2 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black tracking-tight uppercase italic">Neural_Feed</h2>
                    <div className="flex bg-[#111] rounded-lg p-1 border border-white/5">
                      {["ALL", "NEED", "OFFER"].map(filter => (
                        <button
                          key={filter}
                          onClick={() => setFeedFilter(filter as any)}
                          className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-md transition-all ${
                            feedFilter === filter ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab("discover")}
                    className="text-[10px] font-mono text-[#ffb300] hover:underline uppercase tracking-widest"
                  >
                    View_All_Activity
                  </button>
                </div>

                <div className="space-y-4">
                  {activities.filter(a => feedFilter === "ALL" || a.type === feedFilter).length > 0 ? activities.filter(a => feedFilter === "ALL" || a.type === feedFilter).map((item, i) => (
                    <motion.div 
                      key={item.id || i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className={`bg-[#111] border rounded-2xl p-5 flex items-center gap-6 group hover:bg-[#161616] transition-all ${
                        item.type === 'NEED' ? 'border-red-500/30' : 
                        item.type === 'OFFER' ? 'border-green-500/30' : 'border-white/5'
                      }`}
                    >
                      <div className={`w-2 h-12 rounded-full ${
                        item.type === 'NEED' ? 'bg-red-500' : 
                        item.type === 'OFFER' ? 'bg-green-500' : 'bg-[#ffb300]'
                      }`} />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <button 
                            onClick={() => item.uid && setSelectedUserProfile(item.uid)}
                            className={`text-xs font-bold transition-colors ${item.uid ? "hover:text-[#ffb300] cursor-pointer" : ""}`}
                            disabled={!item.uid}
                          >
                            {item.user || "Anonymous"}
                          </button>
                          <span className="text-[10px] text-white/20 font-mono">• {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : item.time || "Just now"}</span>
                        </div>
                        <p className="text-sm text-white/80">{item.msg || item.action}</p>
                        <div className="flex items-center gap-1 mt-2 text-[10px] text-white/30">
                          <MapPin size={10} />
                          <span>{item.location || item.loc || "Unknown Location"}</span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          if (item.uid && item.uid !== user.uid) {
                            setSelectedConversation(item.uid);
                            setSelectedActivity(item);
                            setActiveTab("messages");
                          }
                        }}
                        className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:bg-[#ffb300] hover:text-black disabled:opacity-0 disabled:cursor-not-allowed"
                        disabled={!item.uid || item.uid === user.uid}
                      >
                        Interact
                      </button>
                    </motion.div>
                  )) : (
                    <div className="bg-[#111] border border-white/5 rounded-2xl p-12 text-center space-y-4">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="text-white/20" size={32} />
                      </div>
                      <p className="text-white/40 text-sm italic">The Neural Feed is quiet. Be the first to strengthen the Hive.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-gradient-to-br from-[#ffb300] to-[#ff8c00] rounded-3xl p-8 text-black relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-black tracking-tighter leading-tight mb-4">
                      Strengthen <br />The Hive.
                    </h3>
                    <p className="text-xs font-bold mb-6 opacity-80">Post a need or offer help to boost your reputation and earn Honey.</p>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Create_Post
                    </button>
                  </div>
                  <Hexagon className="absolute -right-8 -bottom-8 text-black/10 w-48 h-48 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                </div>

                <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                  <h3 className="text-sm font-black tracking-widest uppercase mb-6 flex items-center gap-2">
                    <Shield size={16} className="text-[#ffb300]" />
                    Plan_Privileges
                  </h3>
                  <div className="space-y-6">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Current_Tier</span>
                        <span className="text-xs font-black text-[#ffb300] uppercase italic">{userData?.plan || "Drone Plan"}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-white/60">Neural Nodes</span>
                          <span className="text-[10px] font-mono">{userData?.limits?.nodes === 9999 ? "∞" : userData?.limits?.nodes || 1}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-white/60">Daily Requests</span>
                          <span className="text-[10px] font-mono">{userData?.limits?.requests === 9999 ? "∞" : userData?.limits?.requests || 12}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Active_Features</p>
                      <div className="flex flex-wrap gap-2">
                        {(userData?.features || ["Basic AI avatars", "1 personal avatar", "Standard AI assistant"]).map((feature: string, i: number) => (
                          <span key={i} className="text-[9px] font-bold bg-white/5 text-white/60 px-2 py-1 rounded-lg border border-white/5">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>

                    {userData?.plan !== "Queen Plan" && (
                      <button 
                        onClick={() => navigate("/#pricing")}
                        className="w-full py-3 bg-white/5 hover:bg-[#ffb300]/10 border border-white/10 hover:border-[#ffb300]/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all text-white/60 hover:text-[#ffb300]"
                      >
                        Upgrade_Neural_Link
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-[#111] border border-white/5 rounded-3xl p-6">
                  <h3 className="text-sm font-black tracking-widest uppercase mb-6 flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#ffb300]" />
                    Leaderboard
                  </h3>
                  <div className="space-y-4">
                    {leaderboard.length > 0 ? leaderboard.map((member, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-white/20">0{member.rank}</span>
                          <button 
                            onClick={() => setSelectedUserProfile(member.id)}
                            className="text-xs font-bold hover:text-[#ffb300] transition-colors cursor-pointer"
                          >
                            {member.name || "Anonymous"}
                          </button>
                        </div>
                        <span className="text-xs font-mono text-[#ffb300]">{member.honeyScore?.toLocaleString() || 0}</span>
                      </div>
                    )) : (
                      <div className="text-xs text-white/40 italic text-center py-4">No data yet</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
            </div>
            )}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isModalOpen && (
          <CreatePostModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        )}
        {selectedUserProfile && (
          <UserProfileModal userId={selectedUserProfile} onClose={() => setSelectedUserProfile(null)} />
        )}
        {isEditProfileModalOpen && (
          <EditProfileModal user={user} userData={userData} onClose={() => setIsEditProfileModalOpen(false)} />
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 179, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
