import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { Search, SlidersHorizontal, ArrowUpDown, Package } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import { CATEGORIES, mapCategory } from '../lib/categories';

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'All');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  const categories = ['All', ...CATEGORIES];

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const q = collection(db, 'products');
        const firestoreQuery = query(q, orderBy('createdAt', 'desc'));

        const snapshot = await getDocs(firestoreQuery);
        const data = snapshot.docs.map(doc => {
          const productData = doc.data() as object;
          return {
            id: doc.id,
            ...productData,
            category: mapCategory((productData as any).category)
          } as Product;
        });
        
        let filtered = data as Product[];

        // Category Filter
        if (category !== 'All') {
          filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
        }

        // Search Filter
        if (searchTerm.trim()) {
          filtered = filtered.filter(p => {
            const name = p.name || "";
            const description = p.description || "";
            return name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                   description.toLowerCase().includes(searchTerm.toLowerCase());
          });
        }

        // Frontend sorting
        if (sortBy === 'price-low') filtered.sort((a, b) => a.price - b.price);
        if (sortBy === 'price-high') filtered.sort((a, b) => b.price - a.price);

        setProducts(filtered);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [category, searchTerm, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase mb-2">Shop Collection</h1>
          <p className="text-gray-500 text-xs sm:text-sm italic">Showing {products.length} refined styles</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchParams(prev => {
                  if (e.target.value) {
                    prev.set('search', e.target.value);
                  } else {
                    prev.delete('search');
                  }
                  return prev;
                });
              }}
              className="pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all w-full md:w-64"
            />
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
          </div>

          <div className="flex items-center space-x-2 bg-gray-50 border border-gray-100 px-4 py-2 rounded-full overflow-hidden">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-bold uppercase tracking-widest focus:outline-none appearance-none cursor-pointer pr-4"
            >
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-32 space-y-8 md:space-y-10">
            <div>
              <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-4 sm:mb-6 flex items-center">
                <SlidersHorizontal className="w-3 h-3 mr-2" />
                Categories
              </h3>
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-4 lg:space-y-4 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                        setCategory(cat);
                        setSearchParams(cat === 'All' ? {} : { category: cat });
                    }}
                    className={`shrink-0 block text-left text-xs sm:text-sm transition-all px-4 py-2 lg:px-0 lg:py-0 border lg:border-none rounded-full lg:rounded-none whitespace-nowrap ${
                      category === cat ? 'font-bold text-black border-black lg:translate-x-2' : 'text-gray-400 border-gray-100 lg:hover:text-black lg:hover:translate-x-1'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-black text-white rounded-3xl hidden lg:block">
              <h4 className="font-bold text-sm uppercase mb-4 tracking-tighter">Season Sale</h4>
              <p className="text-xs text-white/50 mb-6 leading-relaxed">Up to 40% off on selected curation Combos and classic shirts.</p>
              <Link to="/shop?category=Combos" className="block w-full text-center bg-white text-black py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">Explore Sale</Link>
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
             <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-8">
               {[...Array(6)].map((_, i) => (
                 <div key={i} className="animate-pulse">
                   <div className="aspect-[3/4] bg-gray-100 rounded-2xl mb-4" />
                   <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
                   <div className="h-3 bg-gray-100 rounded w-1/2" />
                 </div>
               ))}
             </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold uppercase tracking-tighter mb-2">No products found</h3>
              <p className="text-gray-400 text-sm">Try adjusting your search or category filters.</p>
              <button 
                onClick={() => {setCategory('All'); setSearchTerm('');}} 
                className="mt-6 text-xs font-bold uppercase underline tracking-widest"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
