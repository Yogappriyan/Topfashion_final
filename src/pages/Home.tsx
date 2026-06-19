import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { ArrowRight, ChevronLeft, ChevronRight, Package, Sparkles } from 'lucide-react';
import { CATEGORIES, mapCategory, CATEGORY_DESCRIPTIONS } from '../lib/categories';

export default function Home() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      id: 1,
      image: 'https://res.cloudinary.com/dd5uc8vjh/image/upload/ChatGPT_Image_Jun_9_2026_10_25_30_PM_qlqf0k',
      fallback: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80&w=1600',
      tagline: 'Couture Collection / Tiruchirappalli, India',
      title1: 'Bespoke',
      title2: 'Elegance.',
      desc: '"True fashion is the ultimate expression of self." — Explore our latest curated collections.',
      buttonText: 'Enter Boutique'
    },
    {
      id: 2,
      image: 'https://res.cloudinary.com/dd5uc8vjh/image/upload/Screenshot_2026-06-09_221311_iouths',
      fallback: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=1600',
      tagline: 'The Handloom Narrative / Crafted Heritage',
      title1: 'Timeless',
      title2: 'Weaves.',
      desc: 'Where heritage details meet fluid modern silhouettes, beautifully crafted to order.',
      buttonText: 'Shop Handlooms'
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&q=80&w=1600',
      fallback: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=1600',
      tagline: 'Master Tailoring / Signature Drape',
      title1: 'Perfect',
      title2: 'Precision.',
      desc: 'Every single stitch calibrated for dynamic movement, lightweight fit, and high style.',
      buttonText: 'Explore Tailored Styles'
    },
    {
      id: 4,
      image: 'https://res.cloudinary.com/dd5uc8vjh/image/upload/ChatGPT_Image_Jun_9_2026_10_20_28_PM_uax5iw',
      fallback: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=1600',
      tagline: 'Season Premiere / Contemporary Festive',
      title1: 'The New',
      title2: 'Wave.',
      desc: 'Bold patterns meet deep royal hues, breathing fresh energy into your daily wardrobe.',
      buttonText: 'View New Arrivals'
    }
  ];

  // Auto sliding trigger
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    async function loadData() {
      try {
        let prodList: Product[] = [];
        try {
          const prodSnapshot = await getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc')));
          prodList = prodSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              category: mapCategory(data.category)
            } as Product;
          });
        } catch (prodErr) {
          handleFirestoreError(prodErr, OperationType.LIST, 'products');
          throw prodErr;
        }
        setProducts(prodList);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getHomeSections = () => {
    return CATEGORIES.map(cat => ({
      id: cat.toLowerCase(),
      title: cat === 'others' ? 'Others' : cat,
      tag: cat,
      desc: CATEGORY_DESCRIPTIONS[cat] || 'Premium collections',
      test: (p: Product) => p.category.toLowerCase() === cat.toLowerCase()
    }));
  };

  const sections = getHomeSections();

  // Scroll active tracking observer
  useEffect(() => {
    if (loading || sections.length === 0) return;

    const observerOption = {
      root: null,
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOption);
    sections.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading, sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 120;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
      setActiveTab(id);
    }
  };

  const handleCarouselScroll = (sectionId: string, direction: 'left' | 'right') => {
    const el = scrollContainerRefs.current[sectionId];
    if (el) {
      const scrollOffset = 340;
      el.scrollBy({
        left: direction === 'left' ? -scrollOffset : scrollOffset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="flex flex-col bg-[#fdfbf7] selection:bg-black selection:text-white">
      {/* Hero Header Carousel Slideshow */}
      <section className="relative h-[60vh] md:h-[95vh] flex items-center overflow-hidden bg-black">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentSlide}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.0 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={slides[currentSlide].image} 
              alt="Hero Fashion Slide" 
              className="w-full h-full object-cover grayscale-[0.05] brightness-[0.6]"
              onError={(e) => {
                 e.currentTarget.src = slides[currentSlide].fallback;
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/25" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentSlide}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-4xl text-white"
            >
              <span className="inline-block text-[10px] font-bold tracking-[0.4em] uppercase mb-4 md:mb-8 text-white/60">
                {slides[currentSlide].tagline}
              </span>
              <h1 className="text-4xl sm:text-7xl md:text-[8.5rem] font-serif tracking-tighter leading-[0.85] mb-6 md:mb-10">
                {slides[currentSlide].title1} <br /> 
                <span className="italic font-light">{slides[currentSlide].title2}</span>
              </h1>
              <p className="text-sm md:text-xl text-white/70 mb-6 md:mb-12 max-w-xl font-serif italic border-l border-white/20 pl-4 md:pl-6">
                {slides[currentSlide].desc}
              </p>
              <div className="flex flex-wrap gap-8">
                <button 
                  onClick={() => navigate('/shop')}
                  className="bg-white text-black px-6 md:px-10 py-3.5 md:py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-black hover:text-white transition-all duration-750 flex items-center group shadow-2xl"
                >
                  {slides[currentSlide].buttonText}
                  <ArrowRight className="ml-4 w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Slide Indicators and Controls */}
        <div className="absolute bottom-6 md:bottom-10 right-6 md:right-10 z-20 flex items-center space-x-3 md:space-x-4">
          <button 
            onClick={() => setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
            className="p-2.5 md:p-3 bg-white/15 hover:bg-white text-white hover:text-black rounded-full border border-white/10 backdrop-blur-md transition-all duration-300"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button 
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="p-2.5 md:p-3 bg-white/15 hover:bg-white text-white hover:text-black rounded-full border border-white/10 backdrop-blur-md transition-all duration-300"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Bottom Progress Bar indicators */}
        <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 z-20 flex items-center space-x-2">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1 transition-all duration-500 rounded-full ${
                currentSlide === idx ? 'w-8 md:w-10 bg-white' : 'w-2 md:w-2.5 bg-white/30'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Visual Arched Categories Showcase */}
      <section className="pt-16 pb-4 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block text-[10px] sm:text-xs font-bold tracking-[0.4em] uppercase text-[#007a78] mb-2 font-mono">
            Seasonal Curation
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif text-gray-900 uppercase tracking-tight">
            Shop by Category edits
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {[
            {
              title: "Feeding Lounge Wear",
              image: "https://res.cloudinary.com/dd5uc8vjh/image/upload/Screenshot_2026-05-17_193837_wdbmld",
              link: "/shop?search=satin"
            },
            {
              title: "Maternity Maxi dresses",
              image: "https://res.cloudinary.com/dd5uc8vjh/image/upload/Screenshot_2026-05-17_193641_x74c6j",
              link: "/shop?search=polofit"
            },
            {
              title: "Non Feeding Lounge Wear",
              image: "https://res.cloudinary.com/dd5uc8vjh/image/upload/Screenshot_2026-05-17_194159_gvnkf4",
              link: "/shop?search=Linen"
            },
            {
              title: "Zipless Feeding Pant Set",
              image: "https://res.cloudinary.com/dd5uc8vjh/image/upload/Screenshot_2026-05-17_194804_x0h38w",
              link: "/shop?search=pant"
            }
          ].map((cat, index) => (
            <div 
              key={index}
              onClick={() => navigate(cat.link)}
              className="relative aspect-[3/4.2] rounded-t-[80px] sm:rounded-t-[120px] overflow-hidden group cursor-pointer shadow-sm hover:shadow-lg transition-all duration-500 bg-gray-50 border border-black/5"
            >
              <img 
                src={cat.image} 
                alt={cat.title} 
                className="w-full h-full object-cover grayscale-[0.05] group-hover:scale-105 transition-transform duration-700"
              />
              {/* Linear Gradient Overlay matching the template design */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex flex-col justify-end p-4 sm:p-6" />
              
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex justify-between items-end z-10">
                <h3 className="text-white text-xs sm:text-sm md:text-lg font-serif tracking-tight leading-tight max-w-[75%] font-medium">
                  {cat.title}
                </h3>
                <span className="p-1.5 sm:p-2 bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 group-hover:bg-white group-hover:text-black transition-all duration-300">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main Core Showcase Layout */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-12 relative">
            
            {/* Mobile Sticky Navigation Menu */}
            <div className="lg:hidden sticky top-20 bg-[#fdfbf7]/90 backdrop-blur-md z-40 py-4 px-2 border-b border-black/5 flex items-center space-x-2 overflow-x-auto scrollbar-none shadow-sm -mx-4 sm:-mx-6">
              {sections.map((sec) => {
                const secProds = products.filter(sec.test);
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-full transition-all border whitespace-nowrap ${
                      activeTab === sec.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-500 border-black/5 hover:border-black/20'
                    }`}
                  >
                    {sec.title} ({secProds.length})
                  </button>
                );
              })}
            </div>

            {/* Showcase Slider Sections */}
            <div className="flex-1 space-y-28">
              {sections.map((sec) => {
                const secProds = products.filter(sec.test);
                
                return (
                  <div 
                    id={sec.id} 
                    key={sec.id} 
                    className="scroll-mt-40 bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-10 border border-black/[0.02] shadow-sm relative group/section hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 border-b border-black/[0.03] pb-6">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="bg-black/5 text-black text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full">
                            {sec.tag}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {secProds.length} STYLES
                          </span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-serif tracking-tight text-gray-900 uppercase">
                          {sec.title}
                        </h2>
                        <p className="text-gray-400 text-xs italic mt-1">{sec.desc}</p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => navigate(`/shop?category=${sec.tag}`)}
                          className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-75 transition-opacity py-2"
                        >
                          View All
                        </button>
                        <div className="flex space-x-1.5 border-l border-black/5 pl-4">
                          <button
                            onClick={() => handleCarouselScroll(sec.id, 'left')}
                            disabled={secProds.length === 0}
                            className="p-2 border border-black/5 rounded-full bg-gray-50 hover:bg-black hover:text-white transition-all disabled:opacity-40"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCarouselScroll(sec.id, 'right')}
                            disabled={secProds.length === 0}
                            className="p-2 border border-black/5 rounded-full bg-gray-50 hover:bg-black hover:text-white transition-all disabled:opacity-40"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {loading ? (
                      <div className="flex space-x-3 md:space-x-6 overflow-x-auto pb-4 scrollbar-none">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="w-[calc(50%-6px)] min-w-[140px] md:min-w-[280px] md:max-w-[280px] animate-pulse shrink-0">
                            <div className="aspect-[3/4] bg-gray-100 rounded-2xl mb-4" />
                            <div className="h-4 bg-gray-100 rounded w-2/3 mb-2" />
                            <div className="h-3 bg-gray-100 rounded w-1/3" />
                          </div>
                        ))}
                      </div>
                    ) : secProds.length > 0 ? (
                      <div 
                        ref={(el) => { scrollContainerRefs.current[sec.id] = el; }}
                        className="flex overflow-x-auto space-x-3 md:space-x-6 pb-4 scroll-smooth snap-x snap-mandatory scrollbar-none"
                      >
                        {secProds.map((product) => (
                          <div 
                            key={product.id} 
                            className="w-[calc(50%-6px)] min-w-[140px] md:min-w-[320px] md:max-w-[320px] snap-start flex-shrink-0"
                          >
                            <ProductCard product={product} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-24 text-center rounded-3xl border border-dashed border-black/5 bg-gray-50/50 flex flex-col items-center justify-center">
                        <Package className="w-10 h-10 text-gray-300 mb-3" />
                        <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                          No products seeded yet
                        </h4>
                        <p className="text-[10px] text-gray-400 italic max-w-xs">
                          Launch sample store or add styles to category "{sec.tag}" in Admin panel.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      {/* Heritage Residence Block */}
      <section className="py-20 md:py-36 bg-white border-t border-black/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-32 items-center">
          <div>
             <div className="aspect-[4/5] bg-gray-50 overflow-hidden shadow-2xl relative rounded-[2rem]">
                <img 
                  src="https://res.cloudinary.com/dd5uc8vjh/image/upload/ChatGPT_Image_May_17_2026_08_05_36_PM_rpciw9" 
                  alt="Suit Detail" 
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute bottom-10 left-10 text-white z-10">
                   <p className="text-[9px] font-bold tracking-[0.3em] uppercase mb-4">SINCE 1998</p>
                   <h4 className="text-4xl font-serif italic">The Golden Stitch</h4>
                </div>
             </div>
          </div>
          <div className="space-y-10">
            <span className="text-[10px] font-bold tracking-[0.5em] text-gray-400 uppercase">OUR RESIDENCE</span>
            <h2 className="text-5xl font-serif tracking-tight leading-none uppercase">
              Tiruchirappalli <br />
              <span className="italic font-light lowercase">Signature.</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed font-serif italic border-l border-black/5 pl-6">
              Experience the legacy of Top Fashion at the ASR Complex, Shastri Road. 
              A destination where tradition meets the contemporary pulse of global style.
            </p>
            <div className="pt-8 border-t border-black/5 flex items-center space-x-12">
               <div>
                  <p className="text-3xl font-serif">4.4</p>
                  <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-2">Global Rating</p>
               </div>
               <div className="w-[1px] h-12 bg-black/5" />
               <div>
                  <p className="text-3xl font-serif">5000+</p>
                  <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-2">Suits Crafted</p>
               </div>
            </div>
            <button 
              onClick={() => window.open('https://www.google.com/maps/dir//Top+Fashion+Mens+wear,+1st+floor,+Shastri+Rd,+above+Aswins+sweets,+near+Ibaco,+North+East+Extension,+Tennur,+Tiruchirappalli,+Tamil+Nadu+620018', '_blank')}
              className="w-full sm:w-auto bg-black text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-xl active:scale-95"
            >
              Consult the Map
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
