import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth, updatePlan } from "../firebase";
import { Shield, Zap, ArrowLeft, CreditCard, Lock, CheckCircle2, Loader2 } from "lucide-react";

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const planName = searchParams.get("plan") || "Drone Plan";
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");

  const handlePayment = async () => {
    if (!user) return;
    setIsProcessing(true);
    
    // Call backend to process payment
    try {
      const response = await fetch("/api/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          planName: planName,
          paymentMethod: paymentMethod
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Payment failed response:", errorText);
        throw new Error(errorText || "Payment failed.");
      }

      const result = await response.json();
      if (result.success) {
        await updatePlan(user.uid, planName);
        setIsSuccess(true);
        setTimeout(() => {
          navigate("/dashboard");
        }, 3000);
      } else {
        throw new Error(result.message || "Payment failed.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Neural link failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-[#ffb300] animate-spin" />
          <span className="text-white/40 font-mono text-[10px] uppercase tracking-[0.4em]">Syncing_Neural_Link...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/40 hover:text-[#ffb300] transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Back to Hive</span>
        </button>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side: Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 font-display">Finalize Your <span className="text-[#ffb300]">Upgrade.</span></h1>
              <p className="text-white/40 leading-relaxed text-lg">
                You are about to upgrade your neural node to the <span className="text-white font-bold">{planName}</span>. 
                This will instantly expand your neighborhood reach and reputation potential.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em]">Selected Tier</span>
                <span className="text-[#ffb300] font-bold">{planName}</span>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em]">Billing Cycle</span>
                <span className="text-white">Monthly</span>
              </div>
              <div className="h-[1px] bg-white/5 my-6" />
              <div className="flex justify-between items-end">
                <span className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em]">Total Due</span>
                <div className="text-right">
                  <div className="text-4xl font-bold">
                    ${planName === "Worker Plan" ? "20.00" : "50.00"}
                  </div>
                  <div className="text-[10px] text-white/20 uppercase tracking-widest mt-1">USD / Month</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-6 rounded-2xl bg-[#ffb300]/5 border border-[#ffb300]/10">
              <Zap className="text-[#ffb300]" size={24} />
              <div className="text-sm">
                <span className="text-[#ffb300] font-bold">AI Insight:</span> This plan will increase your reputation growth by <span className="text-white font-bold">2.4x</span> based on your local network density.
              </div>
            </div>
          </motion.div>

          {/* Right Side: Payment Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-8 md:p-10 rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-3xl relative overflow-hidden"
          >
            {isSuccess ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full bg-[#ffb300] flex items-center justify-center text-black mb-6"
                >
                  <CheckCircle2 size={40} />
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Neural Link Established!</h2>
                <p className="text-white/40 text-sm">Your node has been upgraded. Redirecting to dashboard...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <CreditCard className="text-[#ffb300]" size={20} />
                    <h3 className="text-xl font-bold">Payment Method</h3>
                  </div>
                </div>

                <div className="flex gap-4 mb-8">
                  <button 
                    onClick={() => setPaymentMethod("card")}
                    className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${paymentMethod === "card" ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/10 hover:border-white/30"}`}
                  >
                    Card
                  </button>
                  <button 
                    onClick={() => setPaymentMethod("bank")}
                    className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold uppercase tracking-widest ${paymentMethod === "bank" ? "bg-white text-black border-white" : "bg-transparent text-white/40 border-white/10 hover:border-white/30"}`}
                  >
                    Bank Transfer
                  </button>
                </div>

                <div className="space-y-6">
                  {paymentMethod === "card" ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">Card Information</label>
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/20 text-sm italic">
                          Simulated Neural Payment Interface
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">Expiry</label>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/20 text-sm">MM / YY</div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">CVC</label>
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/20 text-sm">***</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Institution Number</p>
                        <p className="text-lg font-bold text-[#ffb300]">320</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Transit Number</p>
                        <p className="text-lg font-bold text-[#ffb300]">02002</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40">Account Number</p>
                        <p className="text-lg font-bold text-[#ffb300]">9284942</p>
                      </div>
                      <p className="text-[10px] text-white/20 italic pt-2">
                        * Please include your Hive ID in the transfer notes for instant neural verification.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full py-4 rounded-2xl bg-[#ffb300] text-black font-bold hover:shadow-[0_0_30px_rgba(255,179,0,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {paymentMethod === "card" ? "Authorize Upgrade" : "I've Made the Transfer"}
                        <Shield size={18} />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-mono uppercase tracking-widest">
                    <Lock size={10} />
                    End-to-End Encrypted
                  </div>
                </div>

                {/* Background Glow */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#ffb300]/10 rounded-full blur-[80px] pointer-events-none" />
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
