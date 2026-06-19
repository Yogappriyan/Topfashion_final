import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Heart, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { toast } from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
  key?: string | number;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity: 1
    });
    toast.success(`${product.name} added to cart`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group"
    >
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gray-100 mb-4">
          <img 
            src={(product.images && product.images.length > 0) ? product.images[0] : 'https://images.unsplash.com/photo-1594932224824-c451e59639f8?auto=format&fit=crop&q=80'} 
            alt={product.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-4 right-4 flex flex-col space-y-2 md:translate-x-12 md:opacity-0 md:group-hover:translate-x-0 md:group-hover:opacity-100 transition-all duration-300">
            <button 
              onClick={handleAddToCart}
              className="p-2 sm:p-3 bg-white hover:bg-black hover:text-white rounded-full shadow-lg transition-all active:scale-90"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 h-4" />
            </button>
          </div>
          {product.stock <= 5 && product.stock > 0 && (
            <div className="absolute bottom-4 left-4 bg-orange-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full px-4">
              Low Stock
            </div>
          )}
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[2px]">
              <span className="bg-black text-white text-xs uppercase font-bold px-6 py-2 rounded-full">Out of Stock</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-sm font-bold uppercase tracking-tight text-gray-900 line-clamp-1">{product.name}</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest">{product.category}</p>
          <div className="flex items-center space-x-2 pt-0.5">
            <span className="text-sm font-bold text-black">₹{product.price.toLocaleString()}</span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-gray-400 line-through">₹{product.originalPrice.toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center space-x-1 pt-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
            ))}
            <span className="text-[10px] text-gray-400 ml-1">(4.0)</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
