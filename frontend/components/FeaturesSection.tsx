'use client';

import { useState } from 'react';
import type { Feature } from '../types/common';

interface FeaturesSectionProps {
  features: Feature[];
  onFeatureClick: (index: number) => void;
}

export default function FeaturesSection({ features, onFeatureClick }: FeaturesSectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="py-8 md:py-16 bg-gradient-to-b from-pixel-purple-dark to-[#1a1333] border-t border-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Title */}
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-pixel-accent mb-4 md:mb-6 font-press-start text-shadow-pixel leading-tight">
            LILNAD NFT FEATURES
          </h2>
          <p className="text-pixel-text font-vt323 text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed">
            Discover the unique features that make Lilnad NFTs special in the MonadWorld ecosystem
          </p>
        </div>

        {/* Features Grid - Responsive layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Feature Card */}
              <div
                className={`
                  relative bg-pixel-purple-medium border-4 border-pixel-purple-light 
                  shadow-pixel-lg cursor-pointer transition-all duration-300 ease-out
                  p-4 sm:p-6 md:p-8 h-full min-h-[280px] sm:min-h-[320px] md:min-h-[360px]
                  ${hoveredIndex === index ? 'transform -translate-y-2 shadow-pixel-xl' : ''}
                  ${index === 2 ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-pixel-xl hover:-translate-y-2'}
                `}
                onClick={() => index !== 2 && onFeatureClick(index)}
              >
                {/* Card Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="w-full h-full bg-gradient-to-br from-pixel-accent/20 to-transparent"></div>
                </div>

                {/* Card Content */}
                <div className="relative z-10 flex flex-col h-full">
                  {/* Feature Title */}
                  <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-press-start text-pixel-accent text-center mb-4 md:mb-6 leading-tight whitespace-pre-line">
                    {feature.title}
                  </h3>

                  {/* Feature Description */}
                  <p className="text-pixel-text font-vt323 text-base sm:text-lg md:text-xl leading-relaxed text-center flex-grow flex items-center justify-center px-2">
                    {feature.description}
                  </p>

                  {/* Coming Soon Badge for Interactive World */}
                  {index === 2 && (
                    <div className="absolute top-2 right-2 bg-pixel-accent text-pixel-purple-dark px-2 py-1 text-xs font-press-start transform rotate-12">
                      COMING SOON
                    </div>
                  )}

                  {/* Click Indicator */}
                  {index !== 2 && (
                    <div className="text-center mt-4">
                      <span className="text-pixel-accent font-vt323 text-sm md:text-base opacity-75 group-hover:opacity-100 transition-opacity">
                        Click to learn more →
                      </span>
                    </div>
                  )}
                </div>

                {/* Decorative Corners */}
                <div className="absolute top-1 left-1 w-3 h-3 bg-pixel-accent"></div>
                <div className="absolute top-1 right-1 w-3 h-3 bg-pixel-accent"></div>
                <div className="absolute bottom-1 left-1 w-3 h-3 bg-pixel-accent"></div>
                <div className="absolute bottom-1 right-1 w-3 h-3 bg-pixel-accent"></div>

                {/* Hover Effect Overlay */}
                {hoveredIndex === index && index !== 2 && (
                  <div className="absolute inset-0 bg-pixel-accent/10 pointer-events-none animate-pixel-fade-in"></div>
                )}
              </div>

              {/* Feature Number */}
              <div className="absolute -top-4 -left-4 w-8 h-8 sm:w-10 sm:h-10 bg-pixel-accent border-2 border-pixel-purple-dark text-pixel-purple-dark font-press-start text-sm sm:text-base flex items-center justify-center shadow-pixel-sm z-20">
                {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA Section */}
        <div className="text-center mt-12 md:mt-20">
          <p className="text-pixel-text font-vt323 text-lg md:text-xl mb-6 md:mb-8">
            Ready to start your journey in MonadWorld?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 bg-pixel-accent text-black text-base md:text-lg font-press-start font-bold hover:bg-yellow-400 transition-all duration-150 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] border-b-2 border-r-2 border-amber-700">
              MINT YOUR FIRST NFT
            </button>
            <button className="w-full sm:w-auto px-6 py-3 md:px-8 md:py-4 bg-transparent border-2 border-pixel-accent text-pixel-accent text-base md:text-lg font-vt323 font-bold hover:bg-pixel-accent hover:text-pixel-purple-dark transition-all duration-150 shadow-[3px_3px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-x-[1px] hover:translate-y-[1px]">
              LEARN MORE
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}