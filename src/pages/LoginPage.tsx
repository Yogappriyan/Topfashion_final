import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { Chrome, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Welcome back');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('Google verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-gray-50/30 px-4 py-20 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-black/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-black/5 border border-gray-100 overflow-hidden relative z-10 animate-fade-in"
      >
        <div className="p-10 md:p-14">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tighter uppercase mb-2">Member Entrance</h1>
            <p className="text-gray-400 text-xs italic">Authenticating the modern gentleman.</p>
          </div>

          <div className="space-y-6">
             <button 
               onClick={handleGoogleLogin}
               disabled={loading}
               className="w-full flex items-center justify-center space-x-4 bg-black text-white hover:bg-neutral-800 py-5 rounded-[1.5rem] font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 shadow-xl shadow-black/10"
             >
               <Chrome className="w-5 h-5" />
               <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
             </button>
          </div>

          <div className="mt-10 flex items-center justify-center space-x-4 opacity-50">
             <ShieldCheck className="w-4 h-4 text-emerald-600" />
             <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">256-bit encrypted authentication</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
