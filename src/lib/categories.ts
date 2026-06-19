export const CATEGORIES = ['Shirts', 'Pants', 'Jeans', 'Combos', 'Tracks', 'others'];

export function mapCategory(cat: string | undefined | null): string {
  if (!cat) return 'others';
  const c = cat.trim().toLowerCase();
  if (c.includes('formal shirt') || c.includes('casual shirt') || c === 'shirts' || c === 'shirt' || c.includes('shirts')) {
    return 'Shirts';
  }
  if (c.includes('pants') || c.includes('pant') || c.includes('trousers') || c === 'trousers' || c === 'trouser') {
    return 'Pants';
  }
  if (c.includes('jeans') || c === 'jeans' || c === 'jean') {
    return 'Jeans';
  }
  if (c.includes('combo') || c === 'combos') {
    return 'Combos';
  }
  if (c.includes('track') || c === 'tracks' || c === 'trackwear') {
    return 'Tracks';
  }
  return 'others';
}

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Shirts: 'Premium custom-fit shirting styles',
  Pants: 'Perfection in fit and modern tailoring',
  Jeans: 'Refined comfort and durable wash denims',
  Combos: 'Exclusive tailored style matchups and gift sets',
  Tracks: 'Polished athleisure for the contemporary pulse',
  others: 'Luxury suits, blazers, and unique style accents'
};
