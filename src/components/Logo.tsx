import React from 'react';

export default function Logo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center`}>
      {/* Background Circle */}
      <div className="absolute inset-0 bg-[#003B46] rounded-full border-2 border-[#D4AF37] shadow-lg overflow-hidden">
        {/* Subtle texture/gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="relative flex flex-col items-center justify-center text-center p-1">
        {/* Crown */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-1/4 h-auto text-[#D4AF37] mb-0.5" 
          fill="currentColor"
        >
          <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
        </svg>
        
        {/* Main Text */}
        <span className="text-[10px] leading-none font-serif italic text-white tracking-tighter -mt-1 scale-x-125">
          Top
        </span>
        <span className="text-[9px] leading-none font-serif italic text-white tracking-tighter -mt-0.5 scale-x-110">
          Fashion
        </span>
        
        {/* Subtitle */}
        <div className="mt-0.5 bg-[#D4AF37] px-1 py-0.5 rounded-[1px]">
          <span className="text-[4px] leading-none font-bold text-[#003B46] uppercase whitespace-nowrap tracking-tighter">
            Men & Womens Wear
          </span>
        </div>
      </div>
    </div>
  );
}
