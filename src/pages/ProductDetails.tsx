import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Review } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ShoppingBag, Heart, Star, ShieldCheck, Truck, RefreshCw, Send, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [activeImage, setActiveImage] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Smart Recommendations States
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [qvSize, setQvSize] = useState<string>('');
  const [qvColor, setQvColor] = useState<string>('');
  const [qvQuantity, setQvQuantity] = useState(1);
  const [activeQvImage, setActiveQvImage] = useState(0);

  // Carousel references
  const relatedRef = React.useRef<HTMLDivElement>(null);
  const youLikeRef = React.useRef<HTMLDivElement>(null);
  const exploreRef = React.useRef<HTMLDivElement>(null);
  const trendingRef = React.useRef<HTMLDivElement>(null);

  const scrollCarousel = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 340;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      setLoading(true);
      try {
        const productDoc = await getDoc(doc(db, 'products', id));
        if (productDoc.exists()) {
          const productData = { id: productDoc.id, ...productDoc.data() } as Product;
          setProduct(productData);
          if (productData.sizes && productData.sizes.length > 0) {
            setSelectedSize(productData.sizes[0]);
          }
        } else {
          toast.error('Product not found');
          navigate('/shop');
        }

        const reviewsQ = query(collection(db, 'reviews'), where('productId', '==', id));
        const reviewsSnapshot = await getDocs(reviewsQ);
        setReviews(reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));

        // Retrieve all products to feed high-performance smart recommendation pools
        try {
          const allProductsSnapshot = await getDocs(collection(db, 'products'));
          const productsData = allProductsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Product[];
          setAllProducts(productsData);
        } catch (recErr) {
          console.error('Non-blocking error reading recommendations pool list:', recErr);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, navigate]);

  useEffect(() => {
    if (profile?.wishlist && id) {
      setIsWishlisted(profile.wishlist.includes(id));
    }
  }, [profile, id]);

  useEffect(() => {
    if (product) {
      const colors = product.colors && product.colors.length > 0
        ? product.colors
        : ['Jet Black', 'Pure White', 'Warm Beige', 'Navy Blue', 'Slate Grey'];
      setSelectedColor(colors[0]);
    }
  }, [product]);

  useEffect(() => {
    if (quickViewProduct) {
      const colors = quickViewProduct.colors && quickViewProduct.colors.length > 0
        ? quickViewProduct.colors
        : ['Jet Black', 'Pure White', 'Warm Beige', 'Navy Blue', 'Slate Grey'];
      setQvColor(colors[0]);
    }
  }, [quickViewProduct]);

  const toggleWishlist = async () => {
    if (!user) return toast.error('Please sign in first');
    if (!id) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      if (isWishlisted) {
        await updateDoc(userRef, { wishlist: arrayRemove(id) });
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await updateDoc(userRef, { wishlist: arrayUnion(id) });
        setIsWishlisted(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      return toast.error('Please select a size');
    }
    
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity,
      size: selectedSize,
      color: selectedColor
    });
    toast.success('Added to cart');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return toast.error('Please sign in to leave a review');
    if (!newReview.comment) return toast.error('Please enter a comment');

    try {
      const reviewData = {
        productId: id,
        userId: user.uid,
        userName: user.displayName || 'Anonymous User',
        rating: newReview.rating,
        comment: newReview.comment,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'reviews'), reviewData);
      toast.success('Review submitted');
      setNewReview({ rating: 5, comment: '' });
      // Refresh reviews locally
      setReviews(prev => [{ ...reviewData, id: 'tmp', createdAt: new Date() } as Review, ...prev]);
    } catch (error) {
      toast.error('Submission failed');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center animate-pulse text-xs font-bold tracking-widest text-black/50">Designing Details...</div>;
  if (!product) return null;

  // Smart Recommendations Logic
  const activeCategory = (product.category || '').toLowerCase().trim();

  // RELATED PRODUCTS: same category matching products (Priority 1)
  const relatedProducts = allProducts
    .filter(p => p.id !== product.id && (p.category || '').toLowerCase().trim() === activeCategory)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  // High relevance fallback if same-category products are fewer
  const displayedRelated = relatedProducts.length > 0 
    ? relatedProducts 
    : allProducts.filter(p => p.id !== product.id).slice(0, 8);

  // YOU MAY ALSO LIKE: Priority 1 matching mix, fallback to featured / high priority items
  const youMayAlsoLike = allProducts
    .filter(p => p.id !== product.id)
    .sort((a, b) => {
      const matchA = (a.category || '').toLowerCase().trim() === activeCategory ? 2 : 0;
      const matchB = (b.category || '').toLowerCase().trim() === activeCategory ? 2 : 0;
      const featuredA = a.isFeatured ? 1 : 0;
      const featuredB = b.isFeatured ? 1 : 0;
      return (matchB + featuredB) - (matchA + featuredA);
    })
    .slice(0, 8);

  // EXPLORE MORE COLLECTIONS: strictly other category items representing Priority 4
  const exploreCollections = allProducts
    .filter(p => p.id !== product.id && (p.category || '').toLowerCase().trim() !== activeCategory)
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 8);

  // TRENDING PRODUCTS: Priority 2 (featured) + Priority 3 (recently added)
  const trendingProducts = allProducts
    .filter(p => p.id !== product.id)
    .sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    })
    .slice(0, 8);

  const renderProductCard = (p: Product) => {
    const hasDiscount = p.originalPrice && p.originalPrice > p.price;
    const discountPercent = hasDiscount ? Math.round(((p.originalPrice! - p.price) / p.originalPrice!) * 100) : 0;

    const handleAddToCartDirect = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      addToCart({
        productId: p.id,
        name: p.name,
        price: p.price,
        image: p.images[0] || 'https://images.unsplash.com/photo-1594932224824-c451e59639f8?auto=format&fit=crop&q=80',
        quantity: 1,
        size: p.sizes && p.sizes.length > 0 ? p.sizes[0] : undefined
      });
      toast.success(`${p.name} added to bag!`);
    };

    const handleOpenQuickView = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setQuickViewProduct(p);
      if (p.sizes && p.sizes.length > 0) {
        setQvSize(p.sizes[0]);
      } else {
        setQvSize('');
      }
      setQvQuantity(1);
      setActiveQvImage(0);
    };

    return (
      <div 
        key={p.id} 
        className="w-60 sm:w-64 md:w-72 flex-shrink-0 snap-start bg-white border border-black/[0.03] rounded-[2rem] p-4 group hover:shadow-2xl hover:shadow-black/[0.02] transition-all duration-300 flex flex-col justify-between"
      >
        <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 mb-4 cursor-pointer" onClick={() => {
          navigate(`/product/${p.id}`);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}>
          <img 
            src={p.images[0] || 'https://images.unsplash.com/photo-1594932224824-c451e59639f8?auto=format&fit=crop&q=80'} 
            referrerPolicy="no-referrer"
            alt={p.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {hasDiscount && (
            <div className="absolute top-4 left-4 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-md z-10">
              -{discountPercent}% OFF
            </div>
          )}
          <div className="absolute inset-x-4 bottom-4 flex justify-between gap-2 md:opacity-0 md:group-hover:opacity-100 translate-y-2 md:group-hover:translate-y-0 transition-all duration-300">
            <button 
              type="button"
              onClick={handleOpenQuickView}
              className="flex-1 py-3 bg-white hover:bg-black hover:text-white rounded-full text-[9px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all text-black"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Quick View</span>
            </button>
            <button 
              type="button"
              onClick={handleAddToCartDirect}
              className="p-3 bg-black hover:bg-neutral-800 text-white rounded-full shadow-lg active:scale-95 transition-all flex items-center justify-center"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="space-y-1">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">{p.category}</span>
          <h4 
            className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-black line-clamp-1 uppercase cursor-pointer" 
            onClick={() => {
              navigate(`/product/${p.id}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            {p.name}
          </h4>
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-xs sm:text-sm font-bold text-black font-mono">₹{p.price.toLocaleString()}</span>
            {hasDiscount && (
              <span className="text-[10px] text-gray-400 line-through font-mono">₹{p.originalPrice?.toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCarouselSection = (
    title: string, 
    subtitle: string, 
    productsList: Product[], 
    ref: React.RefObject<HTMLDivElement | null>
  ) => {
    if (productsList.length === 0) return null;
    return (
      <div className="mb-20">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
          <div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em]">{subtitle}</span>
            <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-tight text-black mt-2">{title}</h2>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <button 
              type="button" 
              onClick={() => scrollCarousel(ref, 'left')} 
              className="p-3 bg-gray-50 border border-gray-100 hover:bg-black hover:text-white rounded-full transition-all flex items-center justify-center shadow-sm"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              type="button" 
              onClick={() => scrollCarousel(ref, 'right')} 
              className="p-3 bg-gray-50 border border-gray-100 hover:bg-black hover:text-white rounded-full transition-all flex items-center justify-center shadow-sm"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div 
          ref={ref}
          className="flex gap-6 overflow-x-auto pb-6 scrollbar-none snap-x snap-mandatory scroll-smooth touch-pan-x"
        >
          {productsList.map(renderProductCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 mb-16 md:mb-24">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-[4/5] sm:aspect-[3/4] rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-sm group">
             <AnimatePresence mode="wait">
               <motion.img 
                 key={activeImage}
                 initial={{ opacity: 0, scale: 1.1 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ duration: 0.5 }}
                 src={(product.images && product.images.length > activeImage) ? product.images[activeImage] : ''} 
                 alt={product.name} 
                 className="w-full h-full object-cover"
               />
             </AnimatePresence>
             
             {(product.images && product.images.length > 1) && (
               <div className="absolute inset-0 flex items-center justify-between px-6 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                  onClick={() => setActiveImage(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                  className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full hover:bg-white text-black transition-all"
                 >
                   <ChevronLeft className="w-5 h-5" />
                 </button>
                 <button 
                   onClick={() => setActiveImage(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                   className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full hover:bg-white text-black transition-all"
                 >
                   <ChevronRight className="w-5 h-5" />
                 </button>
               </div>
             )}
          </div>
          
                <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-4 scrollbar-none justify-start sm:justify-center">
            {product.images.map((img, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={`flex-shrink-0 w-16 sm:w-24 aspect-[4/5] sm:aspect-[3/4] rounded-lg sm:rounded-2xl overflow-hidden border-2 transition-all p-1 ${
                  activeImage === idx ? 'border-black' : 'border-transparent opacity-50 grayscale hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover rounded-md sm:rounded-xl" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="mb-6 md:mb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 sm:mb-6">
               <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-2 block">{product.category}</span>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-tight">{product.name}</h1>
               </div>
            </div>
            
            <div className="flex items-center space-x-4 sm:space-x-6 mb-6 sm:mb-8">
              <div className="flex items-baseline space-x-3">
                <p className="text-2xl sm:text-3xl font-bold font-mono">₹{product.price.toLocaleString()}</p>
                {product.originalPrice && product.originalPrice > product.price && (
                  <p className="text-lg sm:text-xl text-gray-400 line-through font-mono">₹{product.originalPrice.toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center space-x-2 border-l border-gray-100 pl-4 sm:pl-6">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < 4 ? 'fill-black text-black' : 'text-gray-200'}`} />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-400">({reviews.length} REVIEWS)</span>
              </div>
            </div>

            <p className="text-gray-500 leading-relaxed max-w-lg mb-10 italic">
              {product.description}
            </p>

            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Size</span>
                   <button className="text-[9px] font-bold uppercase tracking-widest text-black border-b border-black">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[56px] h-14 rounded-2xl flex items-center justify-center font-bold text-xs transition-all border ${
                        selectedSize === size 
                        ? 'bg-black text-white border-black shadow-xl ring-4 ring-black/5' 
                        : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            <div className="mb-10">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Color</span>
                {selectedColor && (
                  <span className="text-[10px] font-bold text-[#007a78] uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 italic">
                    Color selected: {selectedColor}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-4">
                {(product.colors && product.colors.length > 0 
                  ? product.colors 
                  : ['Jet Black', 'Pure White', 'Warm Beige', 'Navy Blue', 'Slate Grey']
                ).map((color) => {
                  const COLOR_MAP: Record<string, string> = {
                    'Black': '#000000',
                    'Jet Black': '#111111',
                    'White': '#ffffff',
                    'Pure White': '#ffffff',
                    'Beige': '#f5f5dc',
                    'Warm Beige': '#d2b48c',
                    'Blue': '#0000ff',
                    'Navy Blue': '#1e3a8a',
                    'Navy': '#1e3a8a',
                    'Grey': '#808080',
                    'Slate Grey': '#6b7280',
                    'Red': '#ef4444',
                    'Crimson': '#dc143c',
                    'Green': '#22c55e',
                    'Olive': '#808000',
                    'Sand': '#c2b280',
                    'Pink': '#ec4899',
                    'Yellow': '#eab308'
                  };
                  const mappedColor = COLOR_MAP[color] || color.toLowerCase();
                  const isWhiteOrLight = color.toLowerCase().includes('white') || color.toLowerCase().includes('beige') || mappedColor === '#ffffff' || mappedColor === '#f5f5dc';
                  return (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all relative ${
                        selectedColor === color
                          ? 'border-black scale-110 shadow-xl ring-4 ring-black/10'
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      title={color}
                      type="button"
                    >
                      <span 
                        className={`w-9 h-9 rounded-full block border ${
                          isWhiteOrLight ? 'border-gray-200' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: mappedColor }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                 <div className="bg-gray-50 p-2 rounded-2xl flex items-center justify-between sm:justify-start sm:space-x-4 border border-gray-100">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:text-black text-gray-400 transition-colors"
                    >-</button>
                    <span className="font-bold text-sm w-8 text-center">{quantity}</span>
                    <button 
                       onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                       className="w-10 h-10 flex items-center justify-center font-bold text-lg hover:text-black text-gray-400 transition-colors"
                    >+</button>
                 </div>
                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                   {product.stock} items left in stock
                 </span>
              </div>

              <button 
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="w-full bg-black text-white py-6 rounded-[2rem] font-bold text-sm uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-[0.98] disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center space-x-4 shadow-2xl shadow-black/10"
              >
                <ShoppingBag className="w-5 h-5" />
                <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Shopping Bag'}</span>
              </button>
            </div>
          </div>

          {/* Guarantees */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-auto">
             <div className="flex items-start space-x-4 p-5 rounded-3xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                <Truck className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                <div>
                   <h5 className="text-[10px] font-bold uppercase mb-1">Fast Shipping</h5>
                   <p className="text-[10px] text-gray-500">Free delivery for orders above ₹5,000</p>
                </div>
             </div>
             <div className="flex items-start space-x-4 p-5 rounded-3xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-sm transition-all">
                <RefreshCw className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
                <div>
                   <h5 className="text-[10px] font-bold uppercase mb-1">Easy Returns</h5>
                   <p className="text-[10px] text-gray-500">7-day hassle-free return policy</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* SMART PRODUCT RECOMMENDATIONS SECTIONS */}
      <div className="mt-16 md:mt-24 space-y-16 border-t border-black/[0.03] pt-16 md:pt-24 pb-8">
        {/* 1. Related Products */}
        {renderCarouselSection(
          "Related Products",
          "RECOMMENDED FROM SAME LINE",
          displayedRelated,
          relatedRef
        )}

        {/* 2. You May Also Like */}
        {renderCarouselSection(
          "You May Also Like",
          "PERSONALLY CURATED CLOTHING FOR YOU",
          youMayAlsoLike,
          youLikeRef
        )}

        {/* 3. Trending Products */}
        {renderCarouselSection(
          "Trending Products",
          "BEST SELLING AND CRITICALLY ACCLAIMED",
          trendingProducts,
          trendingRef
        )}

        {/* 4. Explore More Collections */}
        {renderCarouselSection(
          "Explore More Collections",
          "DISCOVER FRESH STYLES FROM OTHER CATEGORIES",
          exploreCollections,
          exploreRef
        )}
      </div>

      {/* Reviews & Feedback */}
      <section className="bg-white rounded-[3rem] border border-gray-100 p-10 md:p-16 mb-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-black" />
        <div className="max-w-4xl mx-auto">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 text-center md:text-left">
              <div>
                 <h2 className="text-4xl font-bold tracking-tighter uppercase mb-4">Customer Opinions</h2>
                 <p className="text-gray-500 max-w-sm italic">Read what others say about the {product.name}. Honest feedback from real buyers.</p>
              </div>
              <div className="bg-gray-50 px-8 py-6 rounded-3xl border border-gray-100 shrink-0">
                 <div className="flex items-center space-x-2 justify-center mb-1">
                   {[...Array(5)].map((_, i) => (
                     <Star key={i} className={`w-5 h-5 ${i < 4 ? 'fill-black text-black' : 'text-gray-200'}`} />
                   ))}
                 </div>
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">4.0 Average Rating</p>
              </div>
           </div>

           {/* Review Form */}
           {user ? (
             <form onSubmit={handleSubmitReview} className="mb-20 bg-gray-50/50 p-8 rounded-[2rem] border border-gray-100">
               <div className="flex flex-col md:flex-row gap-8 mb-6">
                 <div className="shrink-0">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">Your Rating</label>
                    <div className="flex space-x-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button 
                          key={s} 
                          type="button"
                          onClick={() => setNewReview({...newReview, rating: s})}
                          className={`p-2 transition-all ${newReview.rating >= s ? 'text-black' : 'text-gray-200'}`}
                        >
                          <Star className={`w-6 h-6 ${newReview.rating >= s ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                 </div>
                 <div className="flex-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 block">Share your experience</label>
                    <textarea 
                      value={newReview.comment}
                      onChange={(e) => setNewReview({...newReview, comment: e.target.value})}
                      placeholder="Was the fit as expected? How was the fabric quality?"
                      className="w-full bg-white border border-gray-100 rounded-2xl p-5 text-sm focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-300 transition-all resize-none"
                    />
                 </div>
               </div>
               <button 
                 type="submit"
                 className="flex items-center space-x-3 bg-black text-white px-10 py-5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 ml-auto"
               >
                 <span>Post Review</span>
                 <Send className="w-4 h-4" />
               </button>
             </form>
           ) : (
             <div className="mb-20 p-10 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200 text-center">
               <p className="text-gray-400 text-sm mb-6 italic uppercase font-bold tracking-widest">Sign in to share your feedback</p>
               <button onClick={() => navigate('/login')} className="px-10 py-4 bg-white border border-gray-100 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm">Authorize</button>
             </div>
           )}

           {/* Review List */}
           <div className="space-y-12">
             {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="group">
                    <div className="flex flex-col md:flex-row gap-8">
                       <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center font-bold text-gray-300 uppercase italic">
                         {review.userName[0]}
                       </div>
                       <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                             <div>
                               <h4 className="font-bold text-sm uppercase tracking-tight">{review.userName}</h4>
                               <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                                 {review.createdAt?.toDate?.() ? review.createdAt.toDate().toLocaleDateString() : 'Just now'}
                               </p>
                             </div>
                             <div className="flex">
                               {[...Array(5)].map((_, i) => (
                                 <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-black text-black' : 'text-gray-200'}`} />
                               ))}
                             </div>
                          </div>
                          <p className="text-gray-500 text-sm leading-relaxed max-w-2xl">{review.comment}</p>
                       </div>
                    </div>
                  </div>
                ))
             ) : (
               <div className="text-center py-10 opacity-30">
                  <Star className="w-10 h-10 mx-auto mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">Be the first to review</p>
               </div>
             )}
           </div>
        </div>
      </section>

      {/* QUICK VIEW SLIDE OVERLAY COMPONENT */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickViewProduct(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-[2.5rem] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative z-50 shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setQuickViewProduct(null)}
                className="absolute top-6 right-6 p-3 bg-gray-100 hover:bg-black hover:text-white rounded-full z-20 transition-all text-gray-400 animate-pulse"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Product Visual Gallery (Left Column) */}
              <div className="w-full md:w-1/2 p-8 flex flex-col justify-between bg-gray-50/40">
                <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-white border border-gray-150 shadow-inner">
                  <img 
                    src={quickViewProduct.images && quickViewProduct.images[activeQvImage] ? quickViewProduct.images[activeQvImage] : ''} 
                    referrerPolicy="no-referrer"
                    alt={quickViewProduct.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                  <div className="flex gap-2 justify-center mt-4 overflow-x-auto pb-1 scrollbar-none">
                    {quickViewProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveQvImage(idx)}
                        className={`w-12 h-16 rounded-xl overflow-hidden border-2 transition-all p-0.5 shrink-0 ${
                          activeQvImage === idx ? 'border-black opacity-100' : 'border-transparent opacity-50 hover:opacity-80'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Details Specs (Right Column) */}
              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                      {quickViewProduct.category}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-serif font-black text-black uppercase tracking-tight">
                      {quickViewProduct.name}
                    </h3>
                    <div className="flex items-baseline space-x-2 mt-2">
                      <span className="text-xl font-bold font-mono">₹{quickViewProduct.price.toLocaleString()}</span>
                      {quickViewProduct.originalPrice && quickViewProduct.originalPrice > quickViewProduct.price && (
                        <span className="text-sm text-gray-400 line-through font-mono">
                          ₹{quickViewProduct.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs italic leading-relaxed">
                    {quickViewProduct.description && quickViewProduct.description.substring(0, 160)}...
                  </p>

                  {/* Size picking selector */}
                  {quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Select Size</span>
                      <div className="flex flex-wrap gap-2">
                        {quickViewProduct.sizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setQvSize(size)}
                            className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all ${
                              qvSize === size 
                                ? 'bg-black text-white border-black shadow-lg ring-4 ring-black/5' 
                                : 'bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color picking selector */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Select Color</span>
                      {qvColor && (
                        <span className="text-[9px] font-bold text-[#007a78] uppercase tracking-widest italic bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          Color selected: {qvColor}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {(quickViewProduct.colors && quickViewProduct.colors.length > 0
                        ? quickViewProduct.colors
                        : ['Jet Black', 'Pure White', 'Warm Beige', 'Navy Blue', 'Slate Grey']
                      ).map(color => {
                        const COLOR_MAP: Record<string, string> = {
                          'Black': '#000000',
                          'Jet Black': '#111111',
                          'White': '#ffffff',
                          'Pure White': '#ffffff',
                          'Beige': '#f5f5dc',
                          'Warm Beige': '#d2b48c',
                          'Blue': '#0000ff',
                          'Navy Blue': '#1e3a8a',
                          'Navy': '#1e3a8a',
                          'Grey': '#808080',
                          'Slate Grey': '#6b7280',
                          'Red': '#ef4444',
                          'Crimson': '#dc143c',
                          'Green': '#22c55e',
                          'Olive': '#808000',
                          'Sand': '#c2b280',
                          'Pink': '#ec4899',
                          'Yellow': '#eab308'
                        };
                        const mappedColor = COLOR_MAP[color] || color.toLowerCase();
                        const isWhiteOrLight = color.toLowerCase().includes('white') || color.toLowerCase().includes('beige') || mappedColor === '#ffffff' || mappedColor === '#f5f5dc';
                        return (
                          <button
                            key={color}
                            onClick={() => setQvColor(color)}
                            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all relative ${
                              qvColor === color
                                ? 'border-black scale-105 shadow-md ring-4 ring-black/5'
                                : 'border-transparent hover:border-gray-300'
                            }`}
                            title={color}
                            type="button"
                          >
                            <span 
                              className={`w-7 h-7 rounded-full block border ${
                                isWhiteOrLight ? 'border-gray-200' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: mappedColor }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stock counter and Quantity Adjuster */}
                  <div className="flex items-center gap-4">
                    <div className="bg-gray-50 border border-gray-150 rounded-xl p-1 flex items-center justify-between w-28">
                      <button 
                        type="button"
                        onClick={() => setQvQuantity(Math.max(1, qvQuantity - 1))}
                        className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 hover:text-black"
                      >-</button>
                      <span className="font-bold text-xs">{qvQuantity}</span>
                      <button 
                        type="button"
                        onClick={() => setQvQuantity(Math.min(quickViewProduct.stock || 10, qvQuantity + 1))}
                        className="w-8 h-8 flex items-center justify-center font-bold text-gray-400 hover:text-black"
                      >+</button>
                    </div>
                    <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-widest">
                      {quickViewProduct.stock} Left In Stock
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-8">
                  <button
                    type="button"
                    onClick={() => {
                      if (quickViewProduct.sizes && quickViewProduct.sizes.length > 0 && !qvSize) {
                        return toast.error("Please pick a size first");
                      }
                      addToCart({
                        productId: quickViewProduct.id,
                        name: quickViewProduct.name,
                        price: quickViewProduct.price,
                        image: quickViewProduct.images[0],
                        quantity: qvQuantity,
                        size: qvSize || undefined,
                        color: qvColor
                      });
                      toast.success(`${quickViewProduct.name} added to shopping bag!`);
                      setQuickViewProduct(null);
                    }}
                    className="w-full bg-black hover:bg-neutral-800 text-white py-4 rounded-full text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to shopping bag</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickViewProduct(null);
                      navigate(`/product/${quickViewProduct.id}`);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full text-[9px] font-bold text-gray-400 hover:text-black text-center block uppercase tracking-widest py-2 hover:underline transition-all"
                  >
                    View Full Product Specifications
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
