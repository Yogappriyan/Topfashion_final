import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Package, ShoppingBag, LayoutGrid, ShieldCheck, LogOut, ChevronRight, Truck, Clock, Save } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { seedCatalog } from '../../lib/seed';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSales: 0, orderCount: 0, productCount: 0, pendingPayments: 0 });
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Delivery management state parameters
  const [showDeliveryMgmt, setShowDeliveryMgmt] = useState(false);
  const [deliverySettings, setDeliverySettings] = useState({
    expressEnabled: true,
    expressCharge: 150,
    expressLocations: 'tiruchirappalli, tennur, trichy, shastri road',
    normalCharge: 0,
    expressEstMin: '30-45 minutes',
    normalEstDays: '3-4 Days'
  });
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Fetch Delivery configurations from Firestore (falls back gracefully to defaults)
  useEffect(() => {
    async function loadDeliverySettings() {
      if (!isAdmin) return;
      try {
        const docRef = doc(db, 'settings', 'delivery');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDeliverySettings({
            expressEnabled: data.expressEnabled ?? true,
            expressCharge: Number(data.expressCharge ?? 150),
            expressLocations: Array.isArray(data.expressLocations) ? data.expressLocations.join(', ') : '',
            normalCharge: Number(data.normalCharge ?? 0),
            expressEstMin: data.expressEstMin ?? '30-45 minutes',
            normalEstDays: data.normalEstDays ?? '3-4 Days'
          });
        }
      } catch (err) {
        console.warn('Could not load Firestore settings document - using defaults:', err);
      }
    }
    loadDeliverySettings();
  }, [isAdmin]);

  const handleSaveDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDelivery(true);
    const loadingToast = toast.loading('Saving logistics settings...');
    try {
      const locationsArray = deliverySettings.expressLocations
        .split(',')
        .map(loc => loc.trim().toLowerCase())
        .filter(loc => loc.length > 0);

      await setDoc(doc(db, 'settings', 'delivery'), {
        expressEnabled: deliverySettings.expressEnabled,
        expressCharge: Number(deliverySettings.expressCharge),
        expressLocations: locationsArray,
        normalCharge: Number(deliverySettings.normalCharge),
        expressEstMin: deliverySettings.expressEstMin,
        normalEstDays: deliverySettings.normalEstDays,
        updatedAt: new Date().toISOString()
      });

      toast.success('Logistics configurations updated successfully!', { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update delivery settings', { id: loadingToast });
    } finally {
      setSavingDelivery(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const fetchStats = async () => {
    try {
      const productSnapshot = await getDocs(collection(db, 'products'));
      const orderSnapshot = await getDocs(collection(db, 'orders'));
      
      const totalSales = orderSnapshot.docs.reduce((acc, doc) => acc + (doc.data().total || 0), 0);
      
      setStats({
        totalSales,
        orderCount: orderSnapshot.size,
        productCount: productSnapshot.size,
        pendingPayments: orderSnapshot.docs.filter(d => d.data().paymentStatus === 'pending').length
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchStats();
  }, [isAdmin]);

  const handleSeed = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    const loadingToast = toast.loading('Seeding catalog...');
    try {
      await seedCatalog();
      toast.success('Catalog seeded successfully', { id: loadingToast });
      fetchStats();
    } catch (error) {
      toast.error('Failed to seed catalog', { id: loadingToast });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  if (authLoading || !isAdmin) return <div className="min-h-screen flex items-center justify-center font-serif text-2xl">Verifying Admin Access...</div>;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12">
        {/* Header Section */}
        <div className="mb-10 md:mb-24">
          <h1 className="text-4xl sm:text-6xl md:text-[8rem] font-serif mb-6 md:mb-12 tracking-tight leading-none">Store Dashboard</h1>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-black/5 pb-6 md:pb-10">
            <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-300">
              <span className="text-black/60">ADMIN: {user?.displayName || 'THENMOZHI DESIGNS'}</span>
              <span>•</span>
              <span className="normal-case tracking-normal font-medium text-gray-400">{user?.email || 'designs2306@gmail.com'}</span>
              <button 
                className="ml-6 px-6 py-2 border border-black/10 rounded-full text-[9px] hover:bg-black hover:text-white transition-all duration-700 uppercase tracking-widest shadow-sm bg-white disabled:opacity-50"
                onClick={handleSeed}
                disabled={isSeeding}
              >
                {isSeeding ? 'SEEDING...' : 'SETUP SAMPLE STORE'}
              </button>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-all duration-500 group"
            >
              <LogOut className="w-4 h-4" />
              <span>SIGN OUT</span>
            </button>
          </div>
        </div>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 mb-10 md:mb-24">
          {[
            { label: 'PRODUCTS', value: stats.productCount, icon: <Package className="w-3.5 h-3.5 md:w-4 md:h-4" /> },
            { label: 'TOTAL ORDERS', value: stats.orderCount, icon: <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4" /> },
            { label: 'REVENUE', value: stats.totalSales, prefix: '₹', icon: <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" /> },
            { label: 'PENDING PAYMENTS', value: stats.pendingPayments, icon: <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> }
          ].map((stat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-4 md:p-10 border border-black/[0.03] flex flex-col justify-between h-[120px] md:h-[220px] group hover:shadow-2xl hover:shadow-black/[0.02] transition-all duration-700"
            >
              <div className="flex items-center space-x-2 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] text-[#9ca3af] group-hover:text-black transition-colors">
                {stat.icon}
                <span className="truncate">{stat.label}</span>
              </div>
              <div className="text-xl sm:text-2xl md:text-6xl font-serif tracking-tighter flex items-baseline">
                {stat.prefix && <span className="text-sm sm:text-lg md:text-4xl mr-0.5 md:mr-1 font-serif font-light">{stat.prefix}</span>}
                {stat.value.toLocaleString()}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 md:p-14 border border-black/[0.03] group cursor-pointer hover:shadow-2xl hover:shadow-black/[0.02] transition-all duration-1000"
            onClick={() => navigate('/admin/products')}
          >
            <h2 className="text-2xl md:text-4xl font-serif mb-2 md:mb-4">Manage Products</h2>
            <p className="text-gray-400 text-sm mb-6 md:mb-12 font-medium max-w-sm leading-relaxed opacity-60">Add, edit, delete products and manage stock</p>
            <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform duration-700">
              <span>GO TO INVENTORY <span className="ml-2">›</span></span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 md:p-14 border border-black/[0.03] group cursor-pointer hover:shadow-2xl hover:shadow-black/[0.02] transition-all duration-1000"
            onClick={() => navigate('/admin/orders')}
          >
            <h2 className="text-2xl md:text-4xl font-serif mb-2 md:mb-4">Manage Orders</h2>
            <p className="text-gray-400 text-sm mb-6 md:mb-12 font-medium max-w-sm leading-relaxed opacity-60">View orders, update status, confirm payments</p>
            <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform duration-700">
               <span>VIEW ALL ORDERS <span className="ml-2">›</span></span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white p-6 md:p-14 border border-black/[0.03] group cursor-pointer hover:shadow-2xl hover:shadow-black/[0.02] transition-all duration-1000 md:col-span-2"
            onClick={() => setShowDeliveryMgmt(!showDeliveryMgmt)}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl md:text-4xl font-serif">Manage Logistics</h2>
              <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Truck className="w-5 h-5 md:w-6 md:h-6" />
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6 md:mb-12 font-medium max-w-lg leading-relaxed opacity-60">Configure shipping fees, enable / disable Express minutes delivery, set eligible neighborhood segments and locations.</p>
            <div className="flex items-center space-x-3 text-[10px] font-bold uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform duration-700">
              <span className="text-indigo-600 font-extrabold">{showDeliveryMgmt ? "COLLAPSE PANEL ▲" : "EXPAND SETTINGS LOGISTICS ▼"}</span>
            </div>
          </motion.div>
        </div>

        {/* Expansible Delivery Settings Form */}
        {showDeliveryMgmt && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-8 md:mt-16 bg-white border border-black/[0.03] p-6 md:p-16 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/[0.01]"
          >
            <div className="border-b border-black/5 pb-6 md:pb-8 mb-6 md:mb-10">
              <h3 className="text-xl md:text-3xl font-serif mb-2">Logistics Control Panel</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Configure Express (Within minutes) vs Normal (3-4 Days) delivery options</p>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-6 md:space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {/* Express Logistics Toggle */}
                <div className="col-span-full bg-gray-50/50 p-6 md:p-8 rounded-3xl border border-black/[0.02] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wide mb-1">Express Minutes Delivery Option</h4>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-sm">Allow clients inside specified active location areas to checkout with express within minutes courier delivery.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeliverySettings({...deliverySettings, expressEnabled: !deliverySettings.expressEnabled})}
                    className={`w-16 h-10 rounded-full transition-all relative ${
                      deliverySettings.expressEnabled ? 'bg-black' : 'bg-gray-200'
                    }`}
                  >
                    <span 
                      className={`absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md transition-all ${
                        deliverySettings.expressEnabled ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Express Charges */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Express Courier Surcharge (₹ INR)</label>
                  <input 
                    required
                    type="number"
                    value={deliverySettings.expressCharge}
                    onChange={(e) => setDeliverySettings({...deliverySettings, expressCharge: Number(e.target.value)})}
                    className="w-full bg-[#fdfbf7] border border-black/[0.03] rounded-2xl px-4 py-3 md:px-6 md:py-5 text-sm font-mono focus:border-black outline-none"
                    placeholder="150"
                  />
                </div>

                {/* Express Arrival Formula */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Express Estimation Label (e.g. "30-45 minutes")</label>
                  <div className="relative">
                    <input 
                      required
                      type="text"
                      value={deliverySettings.expressEstMin}
                      onChange={(e) => setDeliverySettings({...deliverySettings, expressEstMin: e.target.value})}
                      className="w-full bg-[#fdfbf7] border border-black/[0.03] rounded-2xl px-10 py-3 md:px-12 md:py-5 text-sm focus:border-black outline-none"
                      placeholder="30-45 minutes"
                    />
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  </div>
                </div>

                {/* Normal Logistics Fee */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 font-bold">Normal Delivery Charge (₹ INR - 0 for Free)</label>
                  <input 
                    required
                    type="number"
                    value={deliverySettings.normalCharge}
                    onChange={(e) => setDeliverySettings({...deliverySettings, normalCharge: Number(e.target.value)})}
                    className="w-full bg-[#fdfbf7] border border-black/[0.03] rounded-2xl px-4 py-3 md:px-6 md:py-5 text-sm font-mono focus:border-black outline-none"
                    placeholder="0"
                  />
                </div>

                {/* Normal Est Days */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Normal Arrival Label (e.g. "3-4 Days")</label>
                  <input 
                    required
                    type="text"
                    value={deliverySettings.normalEstDays}
                    onChange={(e) => setDeliverySettings({...deliverySettings, normalEstDays: e.target.value})}
                    className="w-full bg-[#fdfbf7] border border-black/[0.03] rounded-2xl px-4 py-3 md:px-6 md:py-5 text-sm focus:border-black outline-none"
                    placeholder="3-4 Days"
                  />
                </div>

                {/* Eligible neighborhood substrings or towns */}
                <div className="col-span-full">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                    Eligible Express Locations (Comma-separated)
                  </label>
                  <textarea 
                    required
                    rows={3}
                    value={deliverySettings.expressLocations}
                    onChange={(e) => setDeliverySettings({...deliverySettings, expressLocations: e.target.value})}
                    className="w-full bg-[#fdfbf7] border border-black/[0.03] rounded-2xl px-4 py-3 md:px-6 md:py-5 text-sm focus:border-black outline-none resize-none leading-relaxed"
                    placeholder="tiruchirappalli, trichy, tennur, shastri road, thillai nagar"
                  />
                  <p className="text-[10px] text-gray-400 italic mt-3 leading-relaxed">
                    Clients whose checkout address text includes any of these matching substrings (insensitive) will automatically be flagged as eligible for within-minute Express delivery.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-6">
                <button
                  type="submit"
                  disabled={savingDelivery}
                  className="px-10 py-5 bg-black text-white rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform disabled:bg-gray-100 disabled:text-gray-400 flex items-center space-x-3 shadow-lg active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingDelivery ? 'SAVING OPTIONS...' : 'SAVE CONFIGURATIONS'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </div>

    </div>
  );
}
