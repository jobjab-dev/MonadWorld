'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface GamePreviewSliderProps {
  previewImages: string[];
}

export default function GamePreviewSlider({ previewImages }: GamePreviewSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlay) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        (prevIndex + 1) % previewImages.length
      );
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [previewImages.length, isAutoPlay]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlay(false); // Stop auto-play when user manually navigates
    
    // Resume auto-play after 5 seconds
    setTimeout(() => setIsAutoPlay(true), 5000);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? previewImages.length - 1 : prevIndex - 1
    );
    setIsAutoPlay(false);
    setTimeout(() => setIsAutoPlay(true), 5000);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % previewImages.length
    );
    setIsAutoPlay(false);
    setTimeout(() => setIsAutoPlay(true), 5000);
  };

  if (!previewImages || previewImages.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-pixel-purple-dark border-4 border-pixel-purple-medium">
        <p className="text-pixel-text font-vt323 text-lg md:text-xl">No preview images available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto">
      {/* Main Slider Container */}
      <div className="relative aspect-square w-full bg-pixel-purple-dark border-4 border-pixel-purple-medium shadow-pixel-lg overflow-hidden group">
        {/* Main Image Display */}
        <div className="relative w-full h-full">
          <Image
            src={`/${previewImages[currentIndex]}`}
            alt={`Game preview ${currentIndex + 1}`}
            fill
            className="object-cover transition-all duration-500 ease-in-out"
            style={{ imageRendering: 'pixelated' }}
            priority={currentIndex === 0}
          />
          
          {/* Loading overlay */}
          <div className="absolute inset-0 bg-pixel-purple-dark/50 opacity-0 transition-opacity duration-200" />
        </div>

        {/* Navigation Arrows - Hidden on mobile, visible on hover on larger screens */}
        <button 
          onClick={goToPrevious}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-pixel-purple-medium/80 hover:bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent hover:text-white transition-all duration-200 flex items-center justify-center opacity-0 md:group-hover:opacity-100 hover:scale-110 shadow-pixel-sm"
          aria-label="Previous image"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        <button 
          onClick={goToNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-pixel-purple-medium/80 hover:bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent hover:text-white transition-all duration-200 flex items-center justify-center opacity-0 md:group-hover:opacity-100 hover:scale-110 shadow-pixel-sm"
          aria-label="Next image"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Auto-play indicator */}
        {isAutoPlay && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-pixel-accent rounded-full animate-pulse"></div>
        )}
      </div>

      {/* Dots Navigation - Responsive spacing */}
      <div className="flex justify-center items-center mt-4 space-x-2">
        {previewImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 border-2 transition-all duration-300 hover:scale-125 ${
              index === currentIndex
                ? 'bg-pixel-accent border-pixel-accent shadow-pixel-sm'
                : 'bg-transparent border-pixel-purple-medium hover:border-pixel-accent'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter - Hidden on very small screens */}
      <div className="hidden sm:flex justify-center mt-2">
        <span className="text-pixel-text font-vt323 text-sm md:text-base opacity-75">
          {currentIndex + 1} / {previewImages.length}
        </span>
      </div>

      {/* Mobile Navigation Buttons - Only visible on mobile */}
      <div className="flex justify-between mt-4 md:hidden">
        <button 
          onClick={goToPrevious}
          className="px-4 py-2 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent font-vt323 text-sm hover:bg-pixel-purple-light hover:text-pixel-purple-dark transition-all duration-200 shadow-pixel-sm"
        >
          ← Prev
        </button>
        <button 
          onClick={goToNext}
          className="px-4 py-2 bg-pixel-purple-medium border-2 border-pixel-purple-light text-pixel-accent font-vt323 text-sm hover:bg-pixel-purple-light hover:text-pixel-purple-dark transition-all duration-200 shadow-pixel-sm"
        >
          Next →
        </button>
      </div>
    </div>
  );
}