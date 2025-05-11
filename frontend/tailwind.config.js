/** @type {import('tailwindcss').Config} */
module.exports = {
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
      },
      // You can extend other theme properties like boxShadow, borderRadius for pixel style
      borderRadius: {
        'pixel': '0px', // Example: sharp corners
        'pixel-sm': '2px',
        'pixel-md': '4px',
      },
      boxShadow: {
        'pixel': '4px 4px 0px #000', // Example: simple pixel shadow
        'pixel-lg': '6px 6px 0px #000',
      }
    },
  },
  plugins: [],
}; 