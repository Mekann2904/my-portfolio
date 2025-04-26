/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}',
  ],
  theme: {
    extend: {
      colors: {
        project: {
          primary: 'hsl(210, 80%, 55%)',
          secondary: 'hsl(270, 70%, 60%)',
          accent: 'hsl(350, 85%, 60%)',
          dark: 'hsl(220, 15%, 16%)',
          light: 'hsl(220, 30%, 96%)'
        }
      }
    },
  },
  plugins: [],
};
