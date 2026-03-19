import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Townhouse palette
        th: {
          pink:        '#E8917A', // primary CTA — salmon/coral
          'pink-hover':'#D97F68',
          'pink-light':'#FAF0EE', // blush section bg
          'pink-mid':  '#F2D5CE', // medium blush
          cream:       '#FAFAF8', // sidebar / subtle bg
          warm:        '#F7F4F2', // off-white page bg
          border:      '#E5DDD9', // warm border
          text:        '#1A1A1A', // primary text
          muted:       '#8A7E78', // secondary text
          divider:     '#EDE7E3', // grid lines
        },
        // keep for any legacy references
        sidebar: '#FAFAF8',
        accent:  '#E8917A',
        surface: '#F7F4F2',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      letterSpacing: {
        widest: '0.2em',
        'extra-wide': '0.15em',
      },
    },
  },
  plugins: [],
};

export default config;
