import React, { createContext, useContext, useState, useEffect } from 'react';
import { OrderItem } from '../types';

interface CartContextType {
  items: OrderItem[];
  addToCart: (item: OrderItem) => void;
  removeFromCart: (productId: string, size?: string) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem('cart');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) {
        console.warn('Cart items in localStorage was not an array, clearing...');
        localStorage.removeItem('cart');
        return [];
      }
      
      // Migrate and validate each item safely
      const validated: OrderItem[] = [];
      for (const item of parsed) {
        if (item && typeof item === 'object') {
          const productId = item.productId || item.id;
          if (productId && typeof productId === 'string') {
            validated.push({
              productId,
              name: item.name || 'Unknown Product',
              price: typeof item.price === 'number' ? item.price : 0,
              quantity: typeof item.quantity === 'number' ? item.quantity : 1,
              image: item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1594932224824-c451e59639f8?auto=format&fit=crop&q=80',
              size: item.size
            });
          }
        }
      }
      return validated;
    } catch (e) {
      console.error('Failed to parse cart items:', e);
      return [];
    }
  });

  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(safeItems));
  }, [safeItems]);

  const addToCart = (newItem: OrderItem) => {
    setItems(prev => {
      const current = Array.isArray(prev) ? prev : [];
      const existing = current.find(i => i.productId === newItem.productId && i.size === newItem.size);
      if (existing) {
        return current.map(i => (i.productId === newItem.productId && i.size === newItem.size) ? { ...i, quantity: i.quantity + newItem.quantity } : i);
      }
      return [...current, newItem];
    });
  };

  const removeFromCart = (productId: string, size?: string) => {
    setItems(prev => (Array.isArray(prev) ? prev : []).filter(i => !(i.productId === productId && i.size === size)));
  };

  const clearCart = () => setItems([]);

  const totalValue = safeItems.reduce((sum, item) => {
    if (!item) return sum;
    const price = typeof item.price === 'number' ? item.price : 0;
    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
    return sum + (price * quantity);
  }, 0);

  console.log('CartProvider initialized with items:', items.length);

  return (
    <CartContext.Provider value={{ items: safeItems, addToCart, removeFromCart, clearCart, total: totalValue }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
