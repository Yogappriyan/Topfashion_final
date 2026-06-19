import { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Order } from '../../types';
import { 
  Search, 
  ChevronDown, 
  MapPin, 
  Clock,
  Package,
  CreditCard,
  Phone,
  Mail,
  User as UserIcon,
  Filter,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { sendOrderStatusEmail } from '../../services/emailService';
import WhatsAppIcon from '../../components/WhatsAppIcon';

function playExpressOrderSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // Beautiful Chime Bell pattern for real-time alert notice
    playTone(587.33, audioCtx.currentTime, 0.35); // D5
    playTone(880, audioCtx.currentTime + 0.15, 0.45);   // A5
    playTone(587.33, audioCtx.currentTime + 0.35, 0.35); // D5
    playTone(880, audioCtx.currentTime + 0.5, 0.6);   // A5
  } catch (e) {
    console.warn('AudioContext failed to start or browser blocked autoplay:', e);
  }
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [knownExpressOrders, setKnownExpressOrders] = useState<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      setOrders(ordersData);
      setLoading(false);

      // Extract raw express orders that are still marked as "New Express Order"
      const activeExpressIds = snapshot.docs
        .filter(doc => {
          const d = doc.data();
          const isExp = d.deliveryMethod === 'express' || d.isExpress;
          return isExp && (d.status === 'New Express Order' || d.status === 'pending');
        })
        .map(doc => doc.id);

      if (activeExpressIds.length > 0) {
        setKnownExpressOrders(prevKnown => {
          const hasNew = activeExpressIds.some(id => !prevKnown.has(id));
          if (hasNew && !isInitialLoadRef.current) {
            playExpressOrderSound();
            toast.success('⚠️ NEW INSTANT EXPRESS ORDER RECEIVED!', {
              icon: '⚡',
              duration: 10000,
            });
          }
          return new Set(activeExpressIds);
        });
      } else {
        setKnownExpressOrders(new Set());
      }

      isInitialLoadRef.current = false;
    });

    return () => unsubscribe();
  }, []);

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await updateDoc(doc(db, 'orders', orderId), { status });
      
      if (order?.userEmail) {
        await sendOrderStatusEmail(
          order.userEmail,
          orderId,
          status,
          order.deliveryAddress.fullName
        );
      }
      
      toast.success(`Order status updated to ${status} and customer notified`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      toast.error('Failed to update status');
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { paymentStatus });
      toast.success(`Payment status updated to ${paymentStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
      toast.error('Failed to update payment status');
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast.success('Order deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
      toast.error('Failed to delete order');
    }
  };

  const filteredOrders = orders.filter(order => {
    return (
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deliveryAddress.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.deliveryAddress.phone.includes(searchQuery)
    );
  });

  // Sort orders such that Express Courier packages are pinned to the top of the list
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const isAExpress = a.deliveryMethod === 'express' || a.isExpress;
    const isBExpress = b.deliveryMethod === 'express' || b.isExpress;
    if (isAExpress && !isBExpress) return -1;
    if (!isAExpress && isBExpress) return 1;
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return bTime - aTime;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-24 selection:bg-black selection:text-white">
      {/* Header Section */}
      <div className="max-w-[1400px] mx-auto px-8 pt-20 pb-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <h1 className="text-8xl font-serif tracking-tighter text-[#1a1a1a]">Orders</h1>
          
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-black transition-colors" />
            <input 
              type="text"
              placeholder="Search by Order ID, Name or Phone"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-black/5 py-4 pl-14 pr-6 rounded-none text-sm focus:outline-none focus:border-black/20 transition-all font-medium placeholder:text-gray-300 shadow-sm"
            />
          </div>
        </div>

        {/* Orders Stack */}
        <div className="space-y-10">
          <AnimatePresence mode="popLayout">
            {sortedOrders.map((order, orderIdx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ delay: orderIdx * 0.05 }}
                className="bg-white border border-black/5 overflow-hidden group shadow-sm hover:shadow-xl hover:shadow-black/[0.02] transition-all duration-700"
              >
                {/* Order Top Ribbon */}
                <div className="px-10 py-10 border-b border-black/[0.03] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold tracking-tight uppercase">TC-{order.id.slice(0, 15).toUpperCase()}</h3>
                      {(order.deliveryMethod === 'express' || order.isExpress) && (
                        <span className="bg-red-600 text-white text-[9px] font-black tracking-widest px-3.5 py-1 animate-pulse border border-red-700 shadow-md">
                          ⚡ EXPRESS DELIVERY
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">
                      <span className="text-gray-800">{order.deliveryAddress.fullName}</span>
                      <span>•</span>
                      <span>{order.deliveryAddress.phone}</span>
                      <span>•</span>
                      <span>{new Date(order.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-3xl font-serif font-medium">₹{order.total.toLocaleString()}</div>
                </div>

                {/* Main Detailed Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-black/[0.03]">
                  
                  {/* Column 1: Customer Details */}
                  <div className="lg:col-span-4 p-10 space-y-8">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                      <MapPin className="w-3.5 h-3.5 text-gray-300" />
                      <span>Customer Details</span>
                    </div>
                    
                    <div className="space-y-5">
                      <div className="font-bold text-lg tracking-tight">{order.deliveryAddress.fullName}</div>
                      <div className="space-y-2">
                        <a href={`mailto:${order.userEmail}`} className="flex items-center gap-2 text-xs font-medium text-blue-500 hover:underline">
                           <Mail className="w-3 h-3" />
                           {order.userEmail}
                        </a>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                           <Phone className="w-3 h-3" />
                           {order.deliveryAddress.phone}
                        </div>
                      </div>
                      
                      <div className="text-xs text-black/40 leading-relaxed font-bold uppercase tracking-tight bg-gray-50/50 p-4 rounded-xl border border-black/[0.02]">
                        {order.deliveryAddress.street}, <br />
                        {order.deliveryAddress.city} - {order.deliveryAddress.zipCode}
                      </div>
                      
                      <div className="pt-2 text-[10px] font-bold text-gray-300 uppercase tracking-widest italic font-serif">
                        UPI TXN: <span className="text-gray-200">N/A</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Status Management */}
                  <div className="lg:col-span-4 p-10 flex flex-col gap-10">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                        <Package className="w-3.5 h-3.5 text-gray-300" />
                        <span>Order Status</span>
                      </div>
                      <div className="relative">
                        <select 
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className={`w-full border-none py-5 px-8 rounded-none text-[11px] font-bold uppercase tracking-widest appearance-none cursor-pointer focus:ring-1 focus:ring-black/5 transition-all outline-none ${
                            (order.deliveryMethod === 'express' || order.isExpress) ? 'bg-red-500 text-white font-black' : 'bg-[#f8f9fa] text-gray-800'
                          }`}
                        >
                          {(order.deliveryMethod === 'express' || order.isExpress) ? (
                            <>
                              <option value="New Express Order">⚡ NEW EXPRESS ORDER</option>
                              <option value="Preparing">Preparing</option>
                              <option value="Out For Delivery">Out For Delivery</option>
                              <option value="Delivered">✓ Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </>
                          ) : (
                            <>
                              <option value="pending">PENDING</option>
                              <option value="processing">PROCESSING</option>
                              <option value="shipped">SHIPPED</option>
                              <option value="delivered">DELIVERED</option>
                              <option value="cancelled">CANCELLED</option>
                            </>
                          )}
                        </select>
                        <ChevronDown className={`absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
                          (order.deliveryMethod === 'express' || order.isExpress) ? 'text-white' : 'text-black'
                        }`} />
                      </div>
                    </div>

                    <div className="space-y-4 pt-10 border-t border-black/[0.03]">
                      <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                        <CreditCard className="w-3.5 h-3.5 text-gray-300" />
                        <span>Payment Status</span>
                      </div>
                      <div className="relative">
                        <select 
                          value={order.paymentStatus || 'pending'}
                          onChange={(e) => updatePaymentStatus(order.id, e.target.value)}
                          className="w-full bg-[#f8f9fa] border-none py-5 px-8 rounded-none text-[11px] font-bold uppercase tracking-widest appearance-none cursor-pointer focus:ring-1 focus:ring-black/5 transition-all text-gray-800"
                        >
                          <option value="pending">PENDING</option>
                          <option value="confirmed">CONFIRMED</option>
                          <option value="failed">FAILED</option>
                        </select>
                        <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Items Inventory */}
                  <div className="lg:col-span-4 p-10 space-y-8">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                      <Clock className="w-3.5 h-3.5 text-gray-300" />
                      <span>Order Items</span>
                    </div>

                    <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {order.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex gap-6 group/item">
                          <div className="w-20 h-24 bg-gray-50 flex-shrink-0 relative overflow-hidden border border-black/5 shadow-sm">
                            <img 
                              src={item.image} 
                              alt="" 
                              className="w-full h-full object-cover grayscale opacity-70 group-hover/item:opacity-100 group-hover/item:grayscale-0 transition-all duration-700 hover:scale-110" 
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                               <h5 className="text-[11px] font-bold uppercase tracking-widest mb-2 leading-tight pr-10">{item.name}</h5>
                               <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                 {item.size && (
                                   <span className="text-black bg-gray-50 px-2 py-0.5 rounded border border-black/[0.03]">SIZE: {item.size}</span>
                                 )}
                                 <span>QTY: {item.quantity}</span>
                               </div>
                            </div>
                            <div className="text-sm font-mono font-bold tracking-tighter mt-4">₹{item.price.toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* WhatsApp & Delete Actions */}
                <div className="px-10 py-6 bg-[#fdfbf7] border-t border-black/[0.03] flex justify-between items-center">
                   <button 
                     onClick={() => deleteOrder(order.id)}
                     className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors flex items-center gap-2"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                     <span>Delete Order</span>
                   </button>
                   
                   <a 
                     href={`https://wa.me/919345275150?text=Hi, this is about my order TC-${order.id.slice(0,8)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-[10px] font-bold uppercase tracking-widest text-[#25D366] hover:text-green-700 transition-colors flex items-center gap-2"
                   >
                     <span>Contact Customer via WhatsApp</span>
                     <WhatsAppIcon className="w-3.5 h-3.5" />
                   </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredOrders.length === 0 && (
            <div className="text-center py-40 border border-dashed border-black/5 rounded-[2rem]">
               <Filter className="w-12 h-12 text-gray-100 mx-auto mb-6" />
               <p className="text-sm font-medium text-gray-300 font-serif italic mb-2">No orders match your search criteria</p>
               <button 
                 onClick={() => setSearchQuery('')}
                 className="text-[10px] font-bold uppercase tracking-widest text-black hover:underline"
               >
                 Clear all filters
               </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #fdfbf7;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #eee;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ddd;
        }
      `}</style>
    </div>
  );
}
