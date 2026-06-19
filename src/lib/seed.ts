import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const SAMPLE_PRODUCTS = [
  {
    name: "Classic Midnight Tuxedo",
    description: "Expertly tailored slim-fit tuxedo in Italian wool. Features satin peak lapels and covered buttons. Perfect for black-tie events.",
    category: "others",
    price: 45000,
    originalPrice: 55000,
    stock: 12,
    images: ["https://images.unsplash.com/photo-1594932224824-c451e59639f8?auto=format&fit=crop&q=80"],
    sizes: ["S", "M", "L", "XL"],
    isFeatured: true
  },
  {
    name: "Linen Summer Blazer",
    description: "Breathable linen blazer in desert sand. Unstructured for a modern, relaxed silhouette. Ideal for destination weddings.",
    category: "others",
    price: 12500,
    originalPrice: 15000,
    stock: 25,
    images: ["https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80"],
    sizes: ["M", "L", "XL"],
    isFeatured: true
  },
  {
    name: "Silk Heritage Sherwani",
    description: "Exquisite hand-embroidered sherwani in ivory silk. Features traditional Zardosi work and velvet accents.",
    category: "others",
    price: 68000,
    originalPrice: 75000,
    stock: 5,
    images: ["https://images.unsplash.com/photo-1598808503746-f34c53b20ef3?auto=format&fit=crop&q=80"],
    sizes: ["M", "L"],
    isFeatured: true
  },
  {
    name: "Luxury Egyptian Cotton Shirt",
    description: "Tailored fit white formal shirt crafted from 100% long-staple Egyptian cotton. Breathable, durable, and exceptionally soft.",
    category: "Shirts",
    price: 3499,
    originalPrice: 4999,
    stock: 50,
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    isFeatured: true
  },
  {
    name: "Italian Wool Slim Trousers",
    description: "Finely woven flat-front formal trousers in charcoal gray. Features a comfortable stretch waistband and neat creases.",
    category: "Pants",
    price: 4999,
    originalPrice: 6499,
    stock: 35,
    images: ["https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80"],
    sizes: ["S", "M", "L", "XL"],
    isFeatured: true
  },
  {
    name: "Vintage Slim Indigo Jeans",
    description: "Classic high-density raw denim jeans with a natural wash. Made using sustainable authentic ringspun cotton fabric.",
    category: "Jeans",
    price: 3999,
    originalPrice: 5499,
    stock: 45,
    images: ["https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&q=80"],
    sizes: ["30", "32", "34", "36"],
    isFeatured: true
  },
  {
    name: "Casual Sunday Duo Combo",
    description: "A special styled set combining our signature organic linen shirt with stretch casual chino trousers.",
    category: "Combos",
    price: 6999,
    originalPrice: 9999,
    stock: 20,
    images: ["https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&q=80"],
    sizes: ["M", "L", "XL"],
    isFeatured: true
  },
  {
    name: "Elite Performance Trackwear Set",
    description: "Athletic-grade soft touch track jacket & jogger trousers. Engineered for active agility and street level elegance.",
    category: "Tracks",
    price: 4499,
    originalPrice: 5999,
    stock: 30,
    images: ["https://images.unsplash.com/photo-1483721310020-001872fd5822?auto=format&fit=crop&q=80"],
    sizes: ["S", "M", "L", "XL"],
    isFeatured: true
  }
];

export async function seedCatalog() {
  const productsCol = collection(db, 'products');
  for (const product of SAMPLE_PRODUCTS) {
    await addDoc(productsCol, {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}
