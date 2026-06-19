import { useState, FormEvent, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { Search, Clock, CheckCircle2, Truck, Package, MapPin, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import WhatsAppIcon from '../components/WhatsAppIcon';

export default function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('id') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTrack = useCallback(async (idToTrack?: string) => {
    const id = idToTrack || orderId;
    if (!id.trim()) return;

    setLoading(true);
    try {
      const cleanId = id.replace(/^TC-/, '').trim();
      const orderDoc = await getDoc(doc(db, 'orders', cleanId));
      
      if (orderDoc.exists()) {
        setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order);
      } else {
        setOrder(null);
        if (idToTrack) toast.error('Order not found');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      handleTrack(id);
    }
  }, [searchParams, handleTrack]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return toast.error('Please enter an Order ID');
    handleTrack();
  };

  const getStatusStep = (status: string, paymentStatus?: string) => {
    const s = String(status).toLowerCase().trim();
    if (s === 'delivered') return 5;
    if (s === 'out for delivery' || s === 'out_for_delivery') return 4;
    if (s === 'preparing' || s === 'shipped' || s === 'processing') return 3;
    if (s === 'new express order' || paymentStatus === 'confirmed') return 2;
    return 1; // pending
  };

  const currentStep = order ? getStatusStep(order.status, order.paymentStatus) : 0;
  const isExpress = order ? (order.deliveryMethod === 'express' || order.isExpress) : false;

  const steps = isExpress ? [
    { label: 'PENDING', sub: 'ORDER PLACED', icon: <Clock className="w-5 h-5 animate-pulse" /> },
    { label: 'PREPARING', sub: 'PACKING PARCEL', icon: <Package className="w-5 h-5" /> },
    { label: 'OUT FOR DELIVERY', sub: 'ON THE BIKE', icon: <Truck className="w-5 h-5 text-orange-500 animate-bounce" /> },
    { label: 'NEARBY', sub: 'ALMOST THERE', icon: <MapPin className="w-5 h-5" /> },
    { label: 'DELIVERED', sub: 'RECEIVED SECURELY', icon: <CheckCircle2 className="w-5 h-5 text-green-500" /> },
  ] : [
    { label: 'PENDING', sub: 'ORDER RECEIVED', icon: <Clock className="w-5 h-5" /> },
    { label: 'CONFIRMED', sub: 'PAYMENT VERIFIED', icon: <CheckCircle2 className="w-5 h-5" /> },
    { label: 'SHIPPED', sub: 'IN TRANSIT', icon: <Package className="w-5 h-5" /> },
    { label: 'OUT FOR DELIVERY', sub: 'ALMOST THERE', icon: <MapPin className="w-5 h-5" /> },
    { label: 'DELIVERED', sub: 'ENJOY YOUR DRESS!', icon: <CheckCircle2 className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center pt-20 px-4 pb-20 selection:bg-black selection:text-white">
      <div className="max-w-4xl w-full">
        {/* Search Header */}
        <div className="text-center mb-12">
          <p className="text-gray-400 text-sm font-medium mb-6 font-serif italic">Enter your Order ID to check the current status of your purchase.</p>
          <form onSubmit={handleSubmit} className="max-w-xl mx-auto flex shadow-2xl shadow-black/5 bg-white border border-black/5 overflow-hidden">
            <div className="flex-1 relative flex items-center">
              <Search className="absolute left-6 w-5 h-5 text-gray-300" />
              <input 
                type="text" 
                placeholder="TC-20260428-8726"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full py-6 pl-16 pr-6 focus:outline-none font-mono font-bold tracking-widest text-black"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#2a2a2a] text-white px-10 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all active:scale-95 disabled:bg-gray-400"
            >
              {loading ? 'TRACKING...' : 'TRACK'}
            </button>
          </form>
        </div>

        <AnimatePresence>
          {order && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="space-y-16"
            >
              {/* Large Status Card */}
              <div className="bg-[#2a2a2a] text-white p-8 md:p-20 shadow-2xl relative overflow-hidden group border border-white/5">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-12 relative z-10">
                  <div>
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 block mb-3 sm:mb-6">
                      STATUS OF ORDER {isExpress && <span className="text-red-500 animate-pulse ml-2 font-black">⚡ EXPRESS</span>}
                    </span>
                    <h2 className="text-3xl sm:text-5xl md:text-7xl font-serif tracking-tight">TC-{order.id.slice(0, 8).toUpperCase()}...</h2>
                  </div>
                  <div className="text-left md:text-right">
                    <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 block mb-3 sm:mb-6">ESTIMATED DELIVERY</span>
                    <h2 className={`text-2xl sm:text-4xl md:text-5xl font-serif italic ${isExpress ? 'text-red-400 font-extrabold animate-pulse' : 'text-stone-300'}`}>
                      {isExpress ? 'Within 30-45 Minutes' : '5-7 Business Days'}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Stepper Progres */}
              <div className="relative py-8 md:py-12 px-2">
                {/* Connector Line */}
                <div className="absolute top-[calc(48px+1.5rem)] left-10 right-10 h-[1px] bg-gray-100 hidden md:block" />
                <div 
                  className={`absolute top-[calc(48px+1.5rem)] left-10 h-[1px] transition-all duration-1000 hidden md:block ${
                    isExpress ? 'bg-red-500' : 'bg-[#8B735B]'
                  }`} 
                  style={{ width: `${Math.max(0, (currentStep - 1) * 25)}%` }}
                />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-y-12 gap-x-4">
                  {steps.map((step, idx) => {
                    const stepNum = idx + 1;
                    const isCompleted = currentStep > stepNum;
                    const isActive = currentStep === stepNum;
                    const isUpcoming = currentStep < stepNum;

                    return (
                      <div key={idx} className="flex flex-col items-center group relative">
                        {/* Icon Circle */}
                        <div 
                          className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-700 z-10 ${
                            isCompleted || isActive 
                              ? isExpress
                                ? 'bg-red-500 text-white shadow-xl shadow-red-500/20 scale-105 md:scale-110'
                                : 'bg-[#8B735B] text-white shadow-xl shadow-[#8B735B]/20 scale-105 md:scale-110' 
                              : 'bg-white text-gray-200 border border-gray-100'
                          }`}
                        >
                          {step.icon}
                        </div>

                        {/* Text Label */}
                        <div className="mt-4 md:mt-8 text-center px-1">
                          <h4 className={`text-[8px] md:text-[10px] font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] mb-1 md:mb-2 transition-colors duration-500 ${
                            isCompleted || isActive ? 'text-black font-extrabold' : 'text-gray-300'
                          }`}>
                            {step.label}
                          </h4>
                          <p className="text-[7px] md:text-[8px] font-bold text-gray-300 uppercase tracking-widest hidden sm:block font-serif">
                            {step.sub}
                          </p>
                        </div>

                        {/* Mobile connector */}
                        {idx < 4 && (
                          <div className="md:hidden absolute -bottom-8 left-1/2 -translate-x-1/2 w-px h-8 bg-gray-100" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* WhatsApp Floating CTA */}
              <div className="fixed bottom-10 right-10 z-50">
                <a 
                  href={`https://wa.me/918300062574?text=Hi, I am tracking my order TC-${order.id.slice(0,8)}. Can you provide update?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-500/20 hover:scale-110 transition-transform group"
                >
                  <WhatsAppIcon className="w-8 h-8" />
                  <span className="absolute right-20 bg-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 text-black shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap rounded-lg">
                    CHAT WITH US
                  </span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
