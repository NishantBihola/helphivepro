import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsedError = JSON.parse(this.state.error?.message || "");
        if (parsedError.error) {
          errorMessage = `Firestore Error: ${parsedError.error} (Operation: ${parsedError.operationType})`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111] border border-white/5 rounded-[40px] p-12 text-center space-y-8">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-black tracking-tighter italic text-white">System_Glitch</h2>
              <p className="text-white/40 text-sm leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-[#ffb300] text-black rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-transform flex items-center justify-center gap-3"
            >
              <RefreshCcw size={18} />
              Reboot_Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
