import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Product } from '../types';
import { ShoppingBag, Star, Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight, LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist'>('orders');
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'wishlist' || tabParam === 'orders') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!user) return;
    
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch Orders
        const ordersQ = query(
          collection(db, 'orders'), 
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const ordersSnapshot = await getDocs(ordersQ);
        setOrders(ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));

        // Fetch Wishlist
        if (profile?.wishlist && profile.wishlist.length > 0) {
          const products: Product[] = [];
          for (const id of profile.wishlist) {
            const pDoc = await getDoc(doc(db, 'products', id));
            if (pDoc.exists()) products.push({ id: pDoc.id, ...pDoc.data() } as Product);
          }
          setWishlistProducts(products);
        } else {
          setWishlistProducts([]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user, profile]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
    toast.success('Signed out');
  };

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
        <UserIcon className="w-16 h-16 text-gray-100 mb-6" />
        <h1 className="text-4xl font-bold tracking-tighter uppercase mb-4">Identity Required.</h1>
        <p className="text-gray-500 max-w-sm mb-12 italic">Sign in to access your personal collection, track orders, and view your saved items.</p>
        <button 
           onClick={() => navigate('/')} 
           className="bg-black text-white px-12 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all shadow-xl shadow-black/10"
        >
          Return to Entrance
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 md:mb-24 gap-8 md:gap-12">
          <div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-6 sm:space-y-0 sm:space-x-8 mb-8 sm:mb-10 text-center sm:text-left">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white border border-black/5 rounded-none flex items-center justify-center text-4xl sm:text-6xl font-serif italic shadow-xl shadow-black/5 shrink-0">
                {user.email?.[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif tracking-tight leading-none mb-4">{user.displayName || 'Distinguished Member'}</h1>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                  <span>MEMBER ID: {user.uid.slice(0, 8)}</span>
                  <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full" />
                  <span>{user.email}</span>
                </div>
              </div>
            </div>
            <p className="text-gray-400 font-medium italic max-w-lg leading-relaxed text-sm sm:text-base text-center sm:text-left">
              Welcome back to <span className="text-black font-bold uppercase tracking-widest text-[9px]">Top Fashion</span>. 
              Manage your curated selections and monitor your acquisitions from logistics to your residence.
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full sm:w-auto flex items-center justify-center space-x-3 text-red-500 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-50 border border-red-100 px-8 py-4 rounded-none transition-all duration-500"
          >
            <LogOut className="w-4 h-4" />
            <span>EXIT ACCOUNT</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Navigation Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="space-y-6 sticky top-36">
               {[
                 { id: 'orders', label: 'Order History', icon: <Package className="w-4 h-4" /> },
                 { id: 'wishlist', label: 'Curated Wishlist', icon: <Star className="w-4 h-4" /> }
               ].map((tab) => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`w-full flex items-center justify-between p-8 border transition-all duration-700 group ${
                     activeTab === tab.id ? 'bg-white border-black shadow-2xl z-10 translate-x-4' : 'bg-transparent border-black/5 text-gray-400 hover:border-black/20 translate-x-0'
                   }`}
                 >
                   <div className="flex items-center space-x-4">
                     <div className={`transition-colors duration-500 ${activeTab === tab.id ? 'text-black' : 'text-gray-300 group-hover:text-black'}`}>
                       {tab.icon}
                     </div>
                     <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${activeTab === tab.id ? 'text-black' : 'text-gray-400 group-hover:text-black'}`}>
                       {tab.label}
                     </span>
                   </div>
                   <ChevronRight className={`w-3 h-3 transition-all duration-500 ${activeTab === tab.id ? 'text-black opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`} />
                 </button>
               ))}

               <div className="mt-16 p-10 bg-white border border-black/5 shadow-sm">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">MEMBERSHIP PRIVILEGES</h4>
                  <div className="space-y-4">
                    <p className="text-xs font-serif italic text-gray-500">Tier: <span className="text-black font-bold not-italic">Standard Selection</span></p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Status Since 2024</p>
                  </div>
               </div>
            </div>
          </aside>

          {/* Dynamic Content */}
          <div className="flex-1 min-h-[600px]">
             {activeTab === 'orders' ? (
               <div className="space-y-12">
                 <div className="flex items-center space-x-6 mb-16">
                    <h2 className="text-4xl font-serif tracking-tight">Your Transactions</h2>
                    <div className="flex-1 h-[1px] bg-black/5" />
                 </div>
                 
                 {loading ? (
                   [...Array(3)].map((_, i) => (
                     <div key={i} className="bg-white border border-black/5 h-64 shadow-sm animate-pulse mb-8" />
                   ))
                 ) : orders.length > 0 ? (
                   orders.map((order, idx) => (
                     <motion.div 
                      key={order.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="group bg-white border border-black/5 overflow-hidden hover:shadow-2xl hover:shadow-black/5 transition-all duration-1000 mb-12 flex flex-col"
                     >
                       <div className="p-10 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                          <div className="flex items-center space-x-8">
                             <div className={`w-20 h-20 flex items-center justify-center transition-colors duration-700 ${
                               order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                               order.status === 'shipped' ? 'bg-[#fdfbf7] text-[#D4AF37]' :
                               'bg-orange-50 text-orange-600'
                             }`}>
                               {order.status === 'delivered' ? <CheckCircle2 className="w-8 h-8 font-light" /> : 
                                order.status === 'shipped' ? <Truck className="w-8 h-8 font-light" /> : <Clock className="w-8 h-8 font-light" />}
                             </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">
                                  TRACKING ID: 
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(`TC-${order.id.toUpperCase()}`);
                                      toast.success('Tracking ID copied');
                                    }}
                                    className="ml-2 text-black select-all hover:underline"
                                  >
                                    TC-{order.id.toUpperCase()}
                                  </button>
                                </p>
                                <h3 className="text-3xl font-serif tracking-tight italic underline decoration-black/5 underline-offset-8 uppercase">{order.status}</h3>
                             </div>
                          </div>
                          <div className="flex flex-col items-end gap-4">
                             <div className="text-right">
                                <p className="text-2xl md:text-4xl font-serif tracking-tight">₹{order.total.toLocaleString()}</p>
                                <p className="text-[9px] text-gray-300 uppercase font-bold tracking-[0.22em] mt-3 italic">Verified Transaction</p>
                             </div>
                             <Link 
                               to={`/track?id=TC-${order.id.toUpperCase()}`}
                               className="text-[10px] font-bold uppercase tracking-widest text-[#8B735B] hover:text-black flex items-center gap-2 border-b border-[#8B735B]/20 pb-1"
                             >
                               LIVE TRACKING <ChevronRight className="w-3 h-3" />
                             </Link>
                          </div>
                       </div>

                       <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-16 bg-[#fdfbf7]/50">
                          <div className="space-y-8">
                             <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-2">ACQUISITION LIST</h4>
                             <div className="space-y-6">
                                {order.items.map((item, idxi) => (
                                  <div key={idxi} className="flex justify-between items-center group/item">
                                     <div className="flex items-center space-x-4">
                                        <div className="w-10 h-14 bg-gray-200 overflow-hidden">
                                           <img src={item.image} alt="" className="w-full h-full object-cover grayscale opacity-50 group-hover/item:opacity-100 group-hover/item:grayscale-0 transition-all" />
                                        </div>
                                        <div className="flex flex-col">
                                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 line-clamp-1">{item.name} <span className="text-gray-300 mx-1 sm:mx-2">×</span> {item.quantity}</p>
                                          {item.size && (
                                            <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-black bg-[#fdfbf7] border border-black/5 px-2 py-0.5 rounded-full w-fit mt-1">
                                              SIZE: {item.size}
                                            </span>
                                          )}
                                        </div>
                                     </div>
                                     <span className="text-xs font-serif">₹{(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                          <div className="space-y-10">
                             <div className="space-y-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">DESTINATION ENTITY</span>
                                <div className="flex items-start space-x-4">
                                   <MapPin className="w-4 h-4 text-gray-300 mt-0.5" />
                                   <p className="text-xs font-medium text-gray-500 leading-relaxed italic">{order.deliveryAddress.street}, {order.deliveryAddress.city} - {order.deliveryAddress.zipCode}</p>
                                </div>
                             </div>
                             {order.trackingNumber && (
                               <div className="p-8 bg-white border border-black/5 shadow-sm space-y-4">
                                 <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">AIR CARGO TRACKING</p>
                                 <p className="text-xl font-serif tracking-widest text-black/80">{order.trackingNumber}</p>
                               </div>
                             )}
                          </div>
                       </div>
                     </motion.div>
                   ))
                 ) : (
                   <div className="py-40 text-center flex flex-col items-center justify-center">
                     <ShoppingBag className="w-20 h-20 text-gray-100 mb-8" />
                     <p className="text-2xl font-serif italic text-gray-300">Your acquisition history is empty.</p>
                   </div>
                 )}
               </div>
             ) : (
               <div className="space-y-12">
                  <div className="flex items-center space-x-6 mb-16">
                    <h2 className="text-4xl font-serif tracking-tight">Curated Selection</h2>
                    <div className="flex-1 h-[1px] bg-black/5" />
                  </div>
                  {wishlistProducts.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                       {wishlistProducts.map((product, idxp) => (
                         <Link 
                          to={`/product/${product.id}`} 
                          key={product.id} 
                          className="group bg-white border border-black/5 p-8 flex items-center space-x-8 hover:shadow-2xl transition-all duration-700"
                         >
                           <div className="w-32 aspect-[3/4] overflow-hidden bg-gray-50 grayscale group-hover:grayscale-0 transition-all duration-1000 shadow-sm">
                             <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                           </div>
                           <div className="flex-1">
                             <h3 className="font-bold text-[11px] uppercase tracking-[0.1em] text-gray-900 mb-2 truncate">{product.name}</h3>
                             <p className="text-[10px] text-gray-400 mb-6 font-medium uppercase tracking-widest">{product.category}</p>
                             <p className="text-2xl font-serif flex items-baseline space-x-2"><span>₹{product.price.toLocaleString()}</span>{product.originalPrice && product.originalPrice > product.price && <span className="text-sm text-gray-400 line-through font-sans ml-2">₹{product.originalPrice.toLocaleString()}</span>}</p>
                           </div>
                           <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-black group-hover:translate-x-2 transition-all duration-500" />
                         </Link>
                       ))}
                    </div>
                  ) : (
                    <div className="py-40 text-center flex flex-col items-center justify-center">
                       <Star className="w-20 h-20 text-gray-100 mb-8" />
                       <p className="text-2xl font-serif italic text-gray-300">Your curated selection is waiting to be filled.</p>
                    </div>
                  )}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
