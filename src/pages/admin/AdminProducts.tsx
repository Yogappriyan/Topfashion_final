import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { CATEGORIES, mapCategory } from '../../lib/categories';
import { Product } from '../../types';
import { Plus, Trash2, Edit2, X, Search, Image as ImageIcon, CheckCircle, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminProducts() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    originalPrice: 0,
    category: 'Shirts',
    images: [''],
    stock: 0,
    sizes: ['M'],
    isFeatured: false
  });

  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/');
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          category: mapCategory(d.category),
          images: d.images || [],
          sizes: d.sizes || [],
          originalPrice: d.originalPrice || d.price
        } as Product;
      });
      setProducts(data);
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (product: Product | null = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        originalPrice: product.originalPrice || product.price,
        category: product.category,
        images: product.images.length > 0 ? product.images : [''],
        stock: product.stock,
        sizes: product.sizes || ['M'],
        isFeatured: product.isFeatured || false
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: 0,
        originalPrice: 0,
        category: 'Shirts',
        images: [''],
        stock: 0,
        sizes: ['M'],
        isFeatured: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        const productData = {
            ...formData,
            updatedAt: serverTimestamp(),
            price: Number(formData.price),
            originalPrice: Number(formData.originalPrice || formData.price),
            stock: Number(formData.stock),
            images: formData.images.filter(img => img.trim() !== '')
        };

        if (editingProduct) {
            await updateDoc(doc(db, 'products', editingProduct.id), productData);
            toast.success('Product updated');
        } else {
            await addDoc(collection(db, 'products'), {
                ...productData,
                createdAt: serverTimestamp()
            });
            toast.success('Product added');
        }
        setIsModalOpen(false);
        fetchProducts();
    } catch (error) {
        toast.error('Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this product permanently?')) {
        try {
            await deleteDoc(doc(db, 'products', id));
            toast.success('Product deleted');
            fetchProducts();
        } catch (error) {
            toast.error('Delete failed');
        }
    }
  };

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) 
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  const addImageUrl = () => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, '']
    }));
  };

  const removeImageUrl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const updateImageUrl = (index: number, val: string) => {
    const newImages = [...formData.images];
    newImages[index] = val;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (authLoading) return <div className="p-20 text-center font-serif text-2xl">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#1a1a1a] font-sans selection:bg-black selection:text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div className="flex items-center space-x-6">
            <h1 className="text-6xl font-serif tracking-tight">Products</h1>
            <span className="text-gray-300 text-3xl font-light">/</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-2">
              {filteredProducts.length} ITEMS
            </span>
          </div>

          <div className="flex flex-1 max-w-2xl w-full items-center space-x-4">
            <div className="relative flex-1 group">
              <input 
                type="text" 
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-black/5 rounded-none text-sm focus:outline-none focus:ring-1 focus:ring-black/10 transition-all shadow-sm"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-[#1a1a1a] text-white px-8 py-4 flex items-center space-x-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg shadow-black/20 active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>ADD NEW</span>
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <AnimatePresence>
            {filteredProducts.map((p, idx) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white border border-black/5 group flex flex-col hover:shadow-2xl hover:shadow-black/5 transition-all duration-700 relative overflow-hidden"
              >
                {/* Image & Actions */}
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-50">
                  <img 
                    src={p.images[0]} 
                    alt={p.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                  />
                  
                  {/* Action Overlays */}
                  <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={() => handleOpenModal(p)}
                      className="p-2.5 bg-white text-black rounded-sm shadow-xl hover:bg-black hover:text-white transition-all transform hover:-translate-y-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(p.id)}
                      className="p-2.5 bg-white text-red-500 rounded-sm shadow-xl hover:bg-red-500 hover:text-white transition-all transform hover:-translate-y-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {p.isFeatured && (
                    <div className="absolute top-4 left-4 bg-black text-white px-3 py-1 text-[8px] font-bold uppercase tracking-widest">
                      Featured
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-gray-900 mb-2 truncate">
                    {p.name}
                  </h3>
                  <div className="flex justify-between items-center text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-4">
                    <span>{p.category}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                    <span>QTY: {p.stock}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-black">₹{p.price.toLocaleString()}</span>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-xs text-gray-400 line-through">₹{p.originalPrice.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="py-40 text-center">
            <p className="text-gray-400 font-serif text-3xl italic">No products matched your search.</p>
          </div>
        )}
      </div>

      {/* Modern Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-md" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative bg-white w-full max-w-5xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-12 py-10 flex justify-between items-center border-b border-gray-100">
                <h2 className="text-5xl font-serif tracking-tight">
                  {editingProduct ? 'Edit Product' : 'Add New Style'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 hover:rotate-90 transition-transform duration-500"
                >
                  <X className="w-8 h-8 font-light" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-12 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                  {/* Left Column */}
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Product Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full py-4 border-b border-gray-200 focus:border-black outline-none transition-colors text-lg"
                        placeholder="Enter style name..."
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Category</label>
                      <div className="relative group">
                        <select 
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                          className="w-full py-4 border-b border-gray-200 focus:border-black outline-none transition-colors appearance-none bg-transparent"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Price (₹)</label>
                        <input 
                          required
                          type="number" 
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                          className="w-full py-4 border-b border-gray-200 focus:border-black outline-none transition-colors font-serif text-xl"
                        />
                      </div>
                      <div className="space-y-4">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Original Price (₹)</label>
                        <input 
                          type="number" 
                          value={formData.originalPrice}
                          onChange={(e) => setFormData({...formData, originalPrice: Number(e.target.value)})}
                          className="w-full py-4 border-b border-gray-200 focus:border-black outline-none transition-colors font-serif text-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Inventory Count</label>
                      <input 
                        required
                        type="number" 
                        value={formData.stock}
                        onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                        className="w-full py-4 border-b border-gray-200 focus:border-black outline-none transition-colors"
                      />
                    </div>

                    <label className="flex items-center space-x-4 cursor-pointer group">
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${formData.isFeatured ? 'bg-black border-black' : 'border-gray-200 group-hover:border-black'}`}>
                        {formData.isFeatured && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <input 
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                        className="hidden"
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Feature on Home Page</span>
                    </label>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Sizes</label>
                      <div className="flex flex-wrap gap-2">
                        {availableSizes.map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={`min-w-[48px] h-10 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest border transition-all ${
                              formData.sizes.includes(size)
                                ? 'bg-black border-black text-white'
                                : 'bg-white border-gray-200 text-black hover:border-black'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center mb-4">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Image URLs</label>
                        <button 
                          type="button" 
                          onClick={addImageUrl}
                          className="text-[10px] font-bold text-black border-b border-black uppercase tracking-widest hover:text-gray-400 hover:border-gray-400 transition-all"
                        >
                          + ADD IMAGE URL
                        </button>
                      </div>
                      <div className="space-y-3">
                        {formData.images.map((url, idx) => (
                          <div key={idx} className="flex space-x-2 group/url">
                            <input 
                              type="text" 
                              value={url}
                              onChange={(e) => updateImageUrl(idx, e.target.value)}
                              placeholder="https://images.unsplash.com/..."
                              className="flex-1 py-3 border-b border-gray-100 focus:border-black outline-none transition-colors text-sm"
                            />
                            {formData.images.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeImageUrl(idx)}
                                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Description</label>
                      <textarea 
                        required
                        rows={6}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="w-full p-4 border border-gray-100 focus:border-black outline-none transition-colors text-sm resize-none"
                        placeholder="Fabric, fit, and washing instructions..."
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-20 flex justify-end space-x-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-black text-white px-16 py-5 text-[10px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {editingProduct ? 'UPDATE PRODUCT' : 'CREATE PRODUCT'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f7f7f7;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #eee;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ddd;
        }
      `}</style>
    </div>
  );
}
