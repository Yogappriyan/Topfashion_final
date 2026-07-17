import React from 'react';
import logoImg from '../assets/images/Bag Design copy.jpg.jpeg';

export default function Logo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <div className={`relative ${className} overflow-hidden rounded-md border border-[#D4AF37]/30 shadow-sm flex items-center justify-center bg-[#002B33]`}>
      <img 
        src={logoImg} 
        alt="Top Fashion" 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}


