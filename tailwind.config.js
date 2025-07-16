/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}',
  ],
  safelist: [
    'prose',
    'prose-invert',
    'mermaid',
    'flowchart'
  ],
  theme: {
    extend: {
      colors: {
        'bg-base':    '#020617',  // slate-950
        'text-base':  '#94a3b8',  // slate-400
        'text-strong':'#cbd5e1',  // slate-300
        'line-accent':'#818cf8',  // indigo-400
        'code-bg':    '#1e293b',  // slate-800
      },
      typography: {
        invert: {
          css: {
            color: '#e5e7eb', // 本文色
            backgroundColor: '#111827', // 背景色（必要なら）
            a: {
              color: '#8b5cf6',
              '&:hover': { color: '#6366f1' },
              textDecoration: 'underline',
            },
            h1: {
              color: '#cbd5e1',
              marginTop: '3rem',
              marginBottom: '1rem',
              fontWeight: '700',
              borderBottom: '2px solid #6366f1',
            },
            h2: {
              color: '#cbd5e1',
              marginTop: '2.5rem',
              marginBottom: '1rem',
              fontWeight: '600',
              borderBottom: '1px solid #8b5cf6',
            },
            h3: {
              color: '#cbd5e1',
              marginTop: '2rem',
              marginBottom: '0.75rem',
              fontWeight: '600',
            },
            h4: { color: '#cbd5e1' },
            h5: { color: '#cbd5e1' },
            h6: { color: '#cbd5e1' },
            p: {
              marginBottom: '1.5rem',
              color: '#cbd5e1' ,
            },
            pre: {
              backgroundColor: '#1e293b',
              padding: '1.5rem',
              borderRadius: '0.75rem',
            },
            code: {
              backgroundColor: 'rgba(255,255,255,0.05)',
              padding: '0.2em 0.4em',
              borderRadius: '0.3rem',
            },
            'code::before': { content: 'none' },
            'code::after':  { content: 'none' },
            strong: { color: '#94a3b8' }, // slate-400
          }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
