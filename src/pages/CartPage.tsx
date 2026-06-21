import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, MapPin, Phone, User, Mail, CreditCard, CheckCircle2, ShieldCheck, ChevronLeft, Truck, Clock } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { sendOrderConfirmationEmail, sendOwnerExpressNotificationEmail } from '../services/emailService';

export default function CartPage() {
  const cart = useCart();
  
  if (!cart) {
    console.error('CartPage: useCart() returned undefined');
    return <div className="p-20 text-center">System error: Cart not found.</div>;
  }

  const { items = [], removeFromCart, total = 0, clearCart } = cart;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [loading, setLoading] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'razorpay'>('upi');
  const [whatsappPayload, setWhatsappPayload] = useState<{ number: string; message: string } | null>(null);

  // Dynamic delivery state configuration
  const [deliveryMethod, setDeliveryMethod] = useState<'normal' | 'express'>('normal');
  const [deliverySettings, setDeliverySettings] = useState({
    expressEnabled: true,
    expressCharge: 150,
    expressLocations: ['tiruchirappalli', 'tennur', 'trichy', 'shastri road'],
    normalCharge: 0,
    expressEstMin: '30-45 minutes',
    normalEstDays: '3-4 Days'
  });

  const [address, setAddress] = useState({
    fullName: '',
    email: '',
    street: '',
    city: 'Tiruchirappalli',
    zipCode: '',
    phone: ''
  });

  // Fetch Delivery configurations from Firestore (falls back gracefully to defaults)
  useEffect(() => {
    async function loadDeliverySettings() {
      try {
        const docRef = doc(db, 'settings', 'delivery');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setDeliverySettings({
            expressEnabled: data.expressEnabled ?? true,
            expressCharge: Number(data.expressCharge ?? 150),
            expressLocations: Array.isArray(data.expressLocations) ? data.expressLocations.map((l: string) => l.trim().toLowerCase()) : [],
            normalCharge: Number(data.normalCharge ?? 0),
            expressEstMin: data.expressEstMin ?? '30-45 minutes',
            normalEstDays: data.normalEstDays ?? '3-4 Days'
          });
        }
      } catch (err) {
        console.warn('Could not load Firestore settings document - using default fallbacks:', err);
      }
    }
    loadDeliverySettings();
  }, []);

  // Check address eligibility for express delivery
  const isAddressEligibleForExpress = () => {
    if (!deliverySettings.expressEnabled) return false;
    const combinedAddress = `${address.street} ${address.city}`.toLowerCase();
    return deliverySettings.expressLocations.some(loc => combinedAddress.includes(loc.toLowerCase()));
  };

  const eligibleForExpress = isAddressEligibleForExpress();

  // Reset delivery method to normal if user edits address and becomes ineligible
  useEffect(() => {
    if (!eligibleForExpress && deliveryMethod === 'express') {
      setDeliveryMethod('normal');
    }
  }, [eligibleForExpress, deliveryMethod]);

  const deliveryCharge = deliveryMethod === 'express' ? deliverySettings.expressCharge : deliverySettings.normalCharge;
  const finalTotal = Number(total) + deliveryCharge;

  // Sync email when user loads
  React.useEffect(() => {
    if (user?.email && !address.email) {
      setAddress(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    console.log('Starting checkout process for user:', user?.uid || 'guest');
    try {
      const isExpressOrder = deliveryMethod === 'express';
      const paymentMethodLabel = paymentMethod === 'upi' 
        ? 'Direct UPI Transfer' 
        : 'Razorpay Online';

      const orderData = {
        userId: user?.uid || 'guest',
        userEmail: address.email || user?.email || 'no-email@example.com',
        items: items.map(item => ({
          productId: item.productId || '',
          name: item.name || 'Unknown Item',
          price: typeof item.price === 'number' ? item.price : 0,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          image: item.image || '',
          size: item.size || '',
          color: item.color || ''
        })),
        deliveryMethod,
        deliveryCharge,
        subtotal: typeof total === 'number' ? total : 0,
        total: finalTotal,
        paymentMethod: paymentMethodLabel,
        status: isExpressOrder ? 'New Express Order' : 'pending',
        paymentStatus: 'pending',
        isExpress: isExpressOrder,
        createdAt: serverTimestamp(),
        deliveryAddress: {
          fullName: address.fullName || '',
          street: address.street || '',
          city: address.city || 'Tiruchirappalli',
          zipCode: address.zipCode || '',
          phone: address.phone || ''
        },
      };

      console.log('Checkout step 1: Creating order document in Firestore...', orderData);
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      const orderId = docRef.id;
      setCreatedOrderId(orderId);
      console.log('Order created successfully with ID:', orderId);
      
      // WhatsApp notification preparation
      const productSummaryText = items.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ');
      const nowString = new Date().toLocaleTimeString();
      const fullAddressString = `${address.street}, ${address.city} - ${address.zipCode}`;

      const waMsg = `🚨 *NEW INSTANT EXPRESS DELIVERY ORDER* 🚨\n\n` + 
        `*Order ID:* TC-${orderId.toUpperCase()}\n` +
        `*Customer Name:* ${address.fullName}\n` +
        `*Mobile Number:* ${address.phone}\n` +
        `*Delivery Address:* ${fullAddressString}\n` +
        `*Payment Method:* ${paymentMethodLabel}\n` +
        `*Total Amount:* ₹${finalTotal.toLocaleString()}\n` +
        `*Order Time:* ${nowString}\n\n` +
        `*Ordered Products:*\n` +
        items.map(item => `- ${item.name} × ${item.quantity}`).join('\n') + `\n\n` +
        `*Please prepare and dispatch immediately!* ⚡`;

      setWhatsappPayload({
        number: '7826902842',
        message: waMsg
      });

      // Email notification (Browser logs simulation)
      try {
        await sendOwnerExpressNotificationEmail('designs2306@gmail.com', {
          orderId,
          customerName: address.fullName,
          phone: address.phone,
          address: fullAddressString,
          products: productSummaryText,
          total: finalTotal,
          orderTime: nowString,
          paymentMethod: paymentMethodLabel
        });
      } catch (emailErr) {
        console.error('Non-blocking error sending email notification:', emailErr);
      }

      // If Razorpay Online is chosen, prompt Razorpay payment modal
      if (paymentMethod === 'razorpay') {
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SpJjXE3wMCFqWW
        ';
        const rzpWindow = (window as any).Razorpay;
        
        if (!rzpWindow) {
          throw new Error('Razorpay SDK failed to load. Please check your network connection.');
        }

        // Sanitize phone number
        const userPhone = address.phone ? address.phone.replace(/[\s()-]/g, '') : '';

        const options = {
          key: razorpayKey,
          amount: Math.round(Number(finalTotal) * 100), // amount in paise
          currency: 'INR',
          name: 'TOP FASHION',
          description: 'Secure Checkout Payment',
          handler: async function (authResponse: any) {
            console.log('Payment completed on Razorpay:', authResponse);
            setLoading(true);
            try {
              console.log('Payment success! Updating Firestore order status...');
              const orderRef = doc(db, 'orders', orderId);
              await updateDoc(orderRef, {
                paymentStatus: 'paid',
                status: isExpressOrder ? 'Preparing' : 'processing',
                razorpayPaymentId: authResponse.razorpay_payment_id || '',
                updatedAt: serverTimestamp()
              });

              console.log('Payment updated in database successfully!');
              toast.success('Payment completed successfully');

              // Trigger confirmation email
              try {
                await sendOrderConfirmationEmail(
                  orderData.userEmail,
                  orderId,
                  address.fullName,
                  finalTotal
                );
              } catch (emailErr) {
                console.error('Non-blocking error sending confirmation email:', emailErr);
              }
              
              // Update stock
              for (const item of items) {
                if (!item.productId) continue;
                const productRef = doc(db, 'products', item.productId);
                try {
                  await updateDoc(productRef, {
                      stock: increment(-item.quantity)
                  });
                } catch (stockErr) {
                  console.error(`Failed to update stock for product ${item.productId}:`, stockErr);
                }
              }

              setStep('success');
              clearCart();

              if (isExpressOrder) {
                // Auto-open WhatsApp message for Express deliveries
                setTimeout(() => {
                  const waUrl = `https://wa.me/917826902842?text=${encodeURIComponent(waMsg)}`;
                  window.open(waUrl, '_blank');
                }, 1000);
              } else {
                toast.success('Order placed successfully!');
              }

            } catch (updateErr: any) {
              console.error('Failed to update order status post payment:', updateErr);
            } finally {
              setLoading(false);
            }
          },
          prefill: {
            name: address.fullName,
            email: orderData.userEmail,
            contact: userPhone
          },
          theme: {
            color: '#1a1f2c',
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
              // For Express, keep order placed as pending payment rather than deleting
              if (isExpressOrder) {
                toast.success('Express Order recorded! (UPI/Pre-payment Pending)');
                setStep('success');
                clearCart();
              } else {
                toast.error('Payment cancelled');
              }
            }
          }
        };

        const rzpInstance = new rzpWindow(options);
        rzpInstance.open();
      } else {
        // Direct checkout for COD or Direct UPI is immediate!
        // Update stock (non-blocking)
        for (const item of items) {
          if (!item.productId) continue;
          const productRef = doc(db, 'products', item.productId);
          try {
            await updateDoc(productRef, {
                stock: increment(-item.quantity)
            });
          } catch (stockErr) {
            console.error(`Status update error:`, stockErr);
          }
        }

        toast.success(isExpressOrder ? 'Express Order Placed Instantly!' : 'Order Placed successfully!');
        
        // Auto-launch WhatsApp conversation link
        try {
          const waUrl = `https://wa.me/917826902842?text=${encodeURIComponent(waMsg)}`;
          window.open(waUrl, '_blank');
        } catch (e) {
          console.warn('Auto popup blocked, user can click send button manually');
        }

        setStep('success');
        clearCart();
        setLoading(false);
      }

    } catch (error) {
      console.error('Checkout error detailed:', error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Checkout failed: ${errMsg}`);
      setLoading(false);
    }
  };

  if (step === 'success') {
    const isExpress = deliveryMethod === 'express';
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center selection:bg-black selection:text-white pb-20">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-28 h-28 rounded-full flex items-center justify-center mb-10 ${
            isExpress ? 'bg-red-50 text-red-500 ring-4 ring-red-100 animate-pulse' : 'bg-green-50 text-green-500'
          }`}
        >
          {isExpress ? (
            <Clock className="w-14 h-14" />
          ) : (
            <CheckCircle2 className="w-14 h-14" />
          )}
        </motion.div>

        {isExpress ? (
          <div className="space-y-4 mb-2">
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-500 text-white text-[10px] font-black tracking-widest uppercase border border-red-600 shadow-lg animate-bounce">
              ⚡ INSTANT EXPRESS DELIVERY ACTIVE
            </span>
            <h1 className="text-5xl md:text-7xl font-serif tracking-tighter uppercase text-black">
              DISPATCHING NOW.
            </h1>
          </div>
        ) : (
          <h1 className="text-5xl md:text-7xl font-serif tracking-tighter uppercase text-black">
            Style Secured.
          </h1>
        )}

        <div className="bg-white border border-black/5 px-10 py-8 rounded-[2.5rem] mb-10 relative group overflow-hidden shadow-xl shadow-black/[0.01] max-w-lg w-full mt-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-black/[0.02] blur-2xl rounded-full" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">UNIQUE TRACKING ID</p>
          <h2 className="text-3xl md:text-4xl font-mono font-bold tracking-tighter text-black select-all mb-4">
            TC-{createdOrderId?.toUpperCase()}
          </h2>
          {isExpress && (
            <div className="border-t border-black/[0.03] pt-4 mt-4 space-y-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 uppercase font-bold tracking-widest">ESTIMATED LAUNCH:</span>
                <span className="font-bold text-red-500 font-mono">WITHIN {deliverySettings.expressEstMin?.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 uppercase font-bold tracking-widest">OWNER CONTACT:</span>
                <span className="font-bold text-black font-mono">+91 782 690 2842</span>
              </div>
            </div>
          )}
          <button 
            onClick={() => {
              if (createdOrderId) {
                navigator.clipboard.writeText(`TC-${createdOrderId.toUpperCase()}`);
                toast.success('ID copied to clipboard');
              }
            }}
            className="mt-4 text-[9px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
          >
            CLICK TO COPY ORDER ID
          </button>
        </div>

        {isExpress ? (
          <div className="space-y-6 max-w-sm mb-12">
            <p className="text-gray-500 text-sm leading-relaxed">
              Your purchase is marked as <strong className="text-red-500">Express Delivery Within Minutes</strong>. 
              The site owner has been pinged and is packing your parcel immediately!
            </p>
            {whatsappPayload && (
              <div className="bg-[#25D366]/5 border border-[#25D366]/20 py-5 px-6 rounded-3xl space-y-3">
                <p className="text-[11px] font-bold text-[#1E7A3E] uppercase tracking-wider">
                  ⚠️ Direct WhatsApp Dispatcher
                </p>
                <a
                  href={`https://wa.me/917826902842?text=${encodeURIComponent(whatsappPayload.message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2.5 bg-[#25D366] text-white py-3.5 px-6 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-green-600 transition-all shadow-md active:scale-95"
                >
                  Confirm dispatch via WhatsApp
                </a>
                <p className="text-[9px] text-[#25D366] font-medium leading-normal">
                  Click to open WhatsApp and send the pre-filled delivery instruction block to owner's WhatsApp (7826902842) for prompt dispatch!
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 max-w-sm mb-12 italic">
            Your order has been placed. Please ensure you have sent the payment screenshot to <span className="text-black font-bold not-italic">+91 93452 75150</span> on WhatsApp to confirm your purchase.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={`/track?id=TC-${createdOrderId}`} className="bg-black text-white px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
            <span>TRACK PROGRESS LIVE</span>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>
          <Link to="/shop" className="bg-white border border-gray-100 px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-50 transition-all text-gray-500">Continue Browsing</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-16">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row items-center sm:space-x-6 mb-8 md:mb-12 border-b border-gray-100 pb-8 md:pb-12 gap-2 sm:gap-6">
            <button 
              onClick={() => setStep('cart')}
              className={`text-2xl sm:text-3xl font-bold tracking-tighter uppercase transition-opacity ${step === 'cart' ? 'opacity-100' : 'opacity-20 hover:opacity-40'}`}
            >
              Shopping Bag
            </button>
            <span className="text-2xl sm:text-3xl font-bold opacity-10 hidden sm:block">/</span>
            <button 
              disabled={items.length === 0}
              onClick={() => setStep('checkout')}
              className={`text-2xl sm:text-3xl font-bold tracking-tighter uppercase transition-opacity ${step === 'checkout' ? 'opacity-100' : 'opacity-20 hover:opacity-40'}`}
            >
              Logistics
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 'cart' ? (
              <motion.div 
                key="cart"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                {items.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {(items || []).map((item) => (
                        <div key={item.productId + (item.size || '') + (item.color || '')} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-8 bg-gray-50/50 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 group hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all gap-6">
                          <div className="flex items-center space-x-4 sm:space-x-8 w-full sm:w-auto">
                             <div className="w-16 sm:w-24 aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 grayscale group-hover:grayscale-0 transition-all">
                               <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                             </div>
                             <div className="flex-1">
                               <h3 className="font-bold text-sm sm:text-lg uppercase tracking-tight mb-1">{item.name}</h3>
                               <p className="text-[10px] sm:text-sm text-gray-400 font-mono mb-2 sm:mb-4">Ref: {item.productId ? item.productId.slice(0,6) : 'N/A'}</p>
                               <div className="flex flex-wrap items-center gap-2">
                                 <div className="flex items-center space-x-2 sm:space-x-4 bg-white rounded-full px-3 sm:px-4 py-1 sm:py-2 w-fit border border-gray-50">
                                   <span className="text-[9px] sm:text-xs font-bold uppercase tracking-widest text-gray-400">Qty: {item.quantity}</span>
                                 </div>
                                 {item.size && (
                                   <div className="flex items-center space-x-2 sm:space-x-4 bg-black text-white rounded-full px-3 sm:px-4 py-1 sm:py-2 w-fit">
                                     <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Size: {item.size}</span>
                                   </div>
                                 )}
                                 {item.color && (
                                   <div className="flex items-center space-x-2 sm:space-x-4 bg-gray-100 text-gray-850 rounded-full px-3 sm:px-4 py-1 sm:py-2 w-fit border border-gray-100">
                                     <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">Color: {item.color}</span>
                                   </div>
                                 )}
                               </div>
                             </div>
                          </div>
                          <div className="flex sm:flex-col justify-between items-center sm:items-end w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-none pt-4 sm:pt-0 gap-4">
                             <p className="text-lg sm:text-xl font-bold font-mono">₹{(item.price * item.quantity).toLocaleString()}</p>
                             <button 
                               onClick={() => removeFromCart(item.productId, item.size, item.color)}
                               className="p-2 sm:p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                             >
                               <Trash2 className="w-4 h-4 sm:w-5 h-5" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-8">
                       <Link to="/shop" className="text-xs font-bold uppercase tracking-[0.2em] flex items-center hover:translate-x-1 transition-transform">
                         <ChevronLeft className="w-4 h-4 mr-2" />
                         Back to Shop
                       </Link>
                       <button 
                         onClick={() => setStep('checkout')}
                         className="bg-black text-white px-12 py-5 rounded-[2rem] font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-2xl shadow-black/10 flex items-center space-x-4 group"
                       >
                         <span>Confirm Logistics</span>
                         <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                       </button>
                    </div>
                  </>
                ) : (
                  <div className="py-32 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-8">
                       <ShoppingBag className="w-8 h-8 text-gray-200" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tighter uppercase mb-4">Your bag is currently empty.</h2>
                    <p className="text-gray-400 text-sm max-w-xs mb-10 italic">Looks like you haven't added any refined styles to your collection yet.</p>
                    <Link to="/shop" className="bg-black text-white px-10 py-5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all">Start Shopping</Link>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <form onSubmit={handleCheckout} className="space-y-12">
                   <div className="bg-gray-50 rounded-[3rem] p-10 md:p-16 space-y-10 border border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="col-span-full">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Full Legal Name</label>
                            <div className="relative">
                               <input 
                                 required
                                 type="text" 
                                 placeholder="Name"
                                 value={address.fullName}
                                 onChange={(e) => setAddress({...address, fullName: e.target.value})}
                                 className="w-full bg-white border border-transparent rounded-[1.5rem] px-12 py-5 text-sm focus:border-black transition-all outline-none"
                               />
                               <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            </div>
                         </div>
                         <div className="col-span-full">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Email for Manifest & Notifications</label>
                            <div className="relative">
                               <input 
                                 required
                                 type="email" 
                                 placeholder="example@gmail.com"
                                 value={address.email}
                                 onChange={(e) => setAddress({...address, email: e.target.value})}
                                 className="w-full bg-white border border-transparent rounded-[1.5rem] px-12 py-5 text-sm focus:border-black transition-all outline-none"
                               />
                               <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            </div>
                         </div>
                         <div className="col-span-full">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Secret Delivery Location</label>
                            <div className="relative">
                               <textarea 
                                 required
                                 placeholder="Door No, Street Name, Landmark..."
                                 rows={3}
                                 value={address.street}
                                 onChange={(e) => setAddress({...address, street: e.target.value})}
                                 className="w-full bg-white border border-transparent rounded-[1.5rem] px-12 py-5 text-sm focus:border-black transition-all outline-none resize-none"
                               />
                               <MapPin className="absolute left-4 top-6 w-4 h-4 text-gray-300" />
                            </div>
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Zip Code</label>
                            <input 
                              required
                              type="text" 
                              placeholder="620018"
                              value={address.zipCode}
                              onChange={(e) => setAddress({...address, zipCode: e.target.value})}
                              className="w-full bg-white border border-transparent rounded-[1.5rem] px-6 py-5 text-sm focus:border-black transition-all outline-none font-mono"
                            />
                         </div>
                         <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Secure Phone Number</label>
                            <div className="relative">
                               <input 
                                 required
                                 type="tel" 
                                 placeholder="+91 98765 43210"
                                 value={address.phone}
                                 onChange={(e) => setAddress({...address, phone: e.target.value})}
                                 className="w-full bg-white border border-transparent rounded-[1.5rem] px-12 py-5 text-sm focus:border-black transition-all outline-none"
                               />
                               <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            </div>
                         </div>
                      </div>
                   </div>

                  {/* Delivery Selection */}
                  <div className="bg-white border border-gray-100 p-10 md:p-12 rounded-[2.5rem] space-y-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold tracking-tight uppercase text-lg">Delivery Method</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select your desired shipping logistics</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      {/* Normal Delivery */}
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('normal')}
                        className={`p-6 rounded-[2rem] border-2 text-left transition-all relative ${
                          deliveryMethod === 'normal'
                            ? 'border-black bg-black/5'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-bold text-sm uppercase tracking-tight">Normal Delivery</span>
                          <span className="text-xs font-mono font-bold text-green-600">
                            {deliverySettings.normalCharge === 0 ? 'FREE' : `₹${deliverySettings.normalCharge}`}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs italic leading-relaxed">
                          Estimated Arrival: {deliverySettings.normalEstDays}
                        </p>
                        <span className="block text-[8px] font-bold tracking-widest text-gray-400 uppercase mt-2">STANDARD REGISTERED LOGISTICS</span>
                      </button>

                      {/* Express Delivery */}
                      <button
                        type="button"
                        disabled={!eligibleForExpress}
                        onClick={() => {
                          if (eligibleForExpress) {
                            setDeliveryMethod('express');
                          }
                        }}
                        className={`p-6 rounded-[2.0rem] border-2 text-left transition-all relative ${
                          !eligibleForExpress
                            ? 'border-gray-100 bg-gray-50/50 opacity-60 cursor-not-allowed'
                            : deliveryMethod === 'express'
                            ? 'border-black bg-black/5'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <span className="flex items-center gap-2 font-bold text-sm uppercase tracking-tight">
                            Express Minutes
                            <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                          </span>
                          <span className="text-xs font-mono font-bold text-black border border-black/10 px-2.5 py-0.5 rounded-full">
                            ₹{deliverySettings.expressCharge}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs italic leading-relaxed">
                          Estimated Arrival: Within {deliverySettings.expressEstMin}
                        </p>
                        <span className="block text-[8px] font-bold tracking-widest text-gray-400 uppercase mt-2">EXPRESS EXPRESS COURIER</span>
                        
                        {!eligibleForExpress && (
                          <div className="absolute inset-0 bg-[#fdfbf7]/40 rounded-[2rem] flex items-center justify-center p-4 backdrop-blur-[0.5px]">
                            <p className="text-[9px] font-bold tracking-widest text-red-500 uppercase text-center bg-white px-3 py-1 rounded-full shadow-sm border border-red-100">
                              Not eligible here
                            </p>
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Location Help block */}
                    <div className="p-5 rounded-[1.5rem] bg-gray-50 border border-black/[0.03]">
                      <p className="text-[10px] text-gray-500 leading-relaxed font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block shrink-0" />
                        <span>Express available for: <strong>
                          {deliverySettings.expressLocations.map(l => l.toUpperCase()).join(', ')}
                        </strong></span>
                      </p>
                      <p className="text-[9px] text-gray-400 italic mt-1 pl-4">
                        (Tip: Include "{deliverySettings.expressLocations[0] || 'Trichy'}" or relevant keywords in your Secret Delivery address to enable Express!)
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 p-8 md:p-12 rounded-[2.5rem] space-y-8">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold tracking-tight uppercase text-lg">Payment Method</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select how you'd like to pay</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {/* Direct UPI Transfer */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          paymentMethod === 'upi'
                            ? 'border-black bg-black/5 ring-1 ring-black'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <span className="block font-bold text-xs uppercase tracking-tight mb-1">Direct UPI</span>
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest">MANUAL TRANSFER</span>
                      </button>

                      {/* Razorpay Online */}
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('razorpay')}
                        className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                          paymentMethod === 'razorpay'
                            ? 'border-black bg-black/5 ring-1 ring-black'
                            : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <span className="block font-bold text-xs uppercase tracking-tight mb-1">Razorpay API</span>
                        <span className="block text-[8px] font-bold text-gray-400 uppercase tracking-widest">ONLINE GATEWAY</span>
                      </button>
                    </div>

                    {paymentMethod === 'upi' && (
                      <div className="bg-[#fdfbf7] p-8 rounded-[2rem] border border-black/5 mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Owner's UPI / Mobile</span>
                            <span className="text-xl font-mono font-bold tracking-tighter text-black">+91 93452 75150</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText('+91 93452 75150');
                              toast.success('Number copied');
                            }}
                            className="px-6 py-3 bg-black text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform"
                          >
                            COPY
                          </button>
                        </div>
                        <p className="text-gray-400 text-[10px] leading-relaxed italic">
                          Please transfer the total amount to the owner's mobile number above. Once paid, your order will be verified.
                        </p>
                      </div>
                    )}

                    {paymentMethod === 'razorpay' && (
                      <div className="bg-[#fdfbf7] p-8 rounded-[2rem] border border-black/5 mt-4 w-full">
                        <p className="text-black text-xs leading-relaxed font-bold">
                          ✓ Pay online instantly.
                        </p>
                        <p className="text-gray-400 text-[10px] leading-relaxed italic mt-1 font-semibold text-green-600">
                          Secure online card, UPI, netbanking checkout portal managed via Razorpay servers.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 p-5 bg-green-50 rounded-2xl border border-green-100/50">
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="text-[11px] text-green-800 font-medium leading-relaxed">
                        Share your payment screenshot or delivery request on WhatsApp to +91 7826902842 for expedited dispatcher updates.
                      </p>
                    </div>
                  </div>

                  <button 
                     type="submit"
                     disabled={loading}
                     className="w-full bg-black text-white py-6 rounded-[2rem] font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center space-x-4 shadow-2xl shadow-black/10"
                   >
                     {loading ? 'Processing Transaction...' : (
                       <>
                         <CreditCard className="w-5 h-5" />
                         <span>Finalize Order & Pay ₹{finalTotal.toLocaleString()}</span>
                       </>
                     )}
                   </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Order Summary Sidebar */}
        {items.length > 0 && (
          <aside className="w-full lg:w-96 shrink-0">
             <div className="sticky top-32 bg-gray-50 rounded-[3rem] p-10 border border-gray-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-black/5 rounded-full -mr-8 -mt-8" />
                <h3 className="text-xl font-bold tracking-tighter uppercase mb-10">Order Summary</h3>
                
                <div className="space-y-6 mb-10 scrollbar-thin max-h-[30vh] overflow-y-auto pr-2">
                   {(items || []).map((item) => (
                     <div key={item.productId + (item.size || '') + (item.color || '')} className="flex justify-between items-center text-sm">
                        <div className="flex-1 pr-4">
                          <span className="text-gray-500 line-clamp-1">{item.name} × {item.quantity}</span>
                          <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                            {item.size && <span className="text-[9px] text-gray-400 uppercase font-bold tracking-widest block">Size: {item.size}</span>}
                            {item.color && <span className="text-[9px] text-teal-600 uppercase font-bold tracking-widest block font-medium">Color: {item.color}</span>}
                          </div>
                        </div>
                        <span className="font-bold font-mono">₹{(item.price * item.quantity).toLocaleString()}</span>
                     </div>
                   ))}
                </div>

                <div className="space-y-4 pt-10 border-t border-gray-200">
                   <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span className="font-mono">₹{total.toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <span>Logistics ({deliveryMethod === 'express' ? 'Express' : 'Normal'})</span>
                      <span className={deliveryCharge === 0 ? "text-green-500 font-bold shrink-0" : "font-mono font-bold shrink-0"}>{deliveryCharge === 0 ? "Gratis (Free)" : "₹" + deliveryCharge.toLocaleString()}</span>
                   </div>
                   <div className="pt-6 flex justify-between items-center">
                      <span className="text-lg font-bold uppercase tracking-tighter">Total Due</span>
                      <span className="text-3xl font-bold font-mono tracking-tighter">₹{finalTotal.toLocaleString()}</span>
                   </div>
                </div>

                <div className="mt-12 p-6 bg-white rounded-3xl border border-gray-50 flex items-center space-x-4">
                   <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                      <ShieldCheck className="w-5 h-5" />
                   </div>
                   <p className="text-[10px] text-gray-400 leading-relaxed italic">Your transaction is secured by end-to-end military grade encryption.</p>
                </div>
             </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// Helper icons that aren't in lucide or custom versions
