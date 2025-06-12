/** @type {import('tailwindcss').Config} */
module.exports = {
  important: true,
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
 
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'pixel-bg': '#301934',          // ม่วงเข้มเกือบดำสำหรับพื้นหลังหลัก
        'pixel-purple-dark': '#482880', // ม่วงเข้มสำหรับ Map Area หรือ UI Elements
        'pixel-purple-medium': '#8A2BE2',// ม่วง BlueViolet สำหรับ Accent หรือตัวละคร
        'pixel-purple-light': '#D8BFD8', // ม่วง Thistle หรือ Lavender อ่อนๆ
        'pixel-text': '#E6E6FA',          // สี Lavender หรือขาวนวลสำหรับข้อความทั่วไป
        'pixel-accent': '#F0E68C',       // สี Khaki หรือเหลืองอ่อนแบบ Pixel สำหรับ Call to Action
        // You can add more shades or specific use-case colors here
        'brand-purple': '#8A2BE2', // Keep if used elsewhere, or consolidate
        'brand-purple-dark': '#4B0082',
        'brand-purple-light': '#BA55D3',
      },
      fontFamily: {
        // 'sans': ['var(--font-geist-sans)', ...defaultTheme.fontFamily.sans], // Example of overriding default sans
        // 'mono': ['var(--font-geist-mono)', ...defaultTheme.fontFamily.mono],   // Example of overriding default mono
        'pixel': ['var(--font-pixelify-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'], // Apply Pixelify Sans via this utility
        'vt323': ['var(--font-vt323)', 'monospace'],
        'press-start': ['var(--font-press-start-2p)', 'monospace'],
      },
      // You can extend other theme properties like boxShadow, borderRadius for pixel style
      borderRadius: {
        'pixel': '0px', // Example: sharp corners
        'pixel-sm': '2px',
        'pixel-md': '4px',
      },
      boxShadow: {
        'pixel': '4px 4px 0px #000', // Example: simple pixel shadow
        'pixel-sm': '2px 2px 0px #000',
        'pixel-md': '4px 4px 0px #000',
        'pixel-lg': '6px 6px 0px #000',
        'pixel-xl': '8px 8px 0px #000',
        'pixel-2xl': '12px 12px 0px #000',
      },
      textShadow: {
        'pixel': '2px 2px 0px #000',
        'pixel-sm': '1px 1px 0px #000',
        'pixel-lg': '3px 3px 0px #000',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shine': 'shine 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'twinkle': 'twinkle 4s ease infinite',
        'fadeIn': 'fadeIn 0.3s ease-in-out',
        'scaleIn': 'scaleIn 0.3s ease-out',
        'pixel-glow': 'pixel-glow 2s ease-in-out infinite',
        'pixel-bounce': 'pixel-bounce 2s ease-in-out infinite',
        'pixel-fade-in': 'pixel-fade-in 0.3s ease-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '20%, 100%': { transform: 'translateX(100%)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.2' },
          '50%': { opacity: '0.8' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pixel-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(138, 43, 226, 0.5)',
            transform: 'scale(1)'
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(138, 43, 226, 0.8)',
            transform: 'scale(1.02)'
          },
        },
        'pixel-bounce': {
          '0%, 20%, 53%, 80%, 100%': { 
            transform: 'translateY(0px)' 
          },
          '40%, 43%': { 
            transform: 'translateY(-15px)' 
          },
          '70%': { 
            transform: 'translateY(-5px)' 
          },
          '90%': { 
            transform: 'translateY(-2px)' 
          },
        },
        'pixel-fade-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.8)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)'
          },
        },
      },
    },
  },
  plugins: [],
}; 