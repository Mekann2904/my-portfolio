/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}',
  ],
  theme: {
    extend: {
      typography: (theme) => ({
        // 通常のプローズ
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: theme('colors.gray.100'),
            lineHeight: '1.75',
            'h1': {
              fontSize: '2.25rem',
              fontWeight: '700',
              marginTop: '2.5rem',
              marginBottom: '1.25rem',
            },
            'h2': {
              fontSize: '1.875rem',
              fontWeight: '600',
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            'p': {
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            a: {
              color: theme('colors.blue.300'),
              textDecoration: 'underline',
            },
            blockquote: {
              borderLeftWidth: '4px',
              borderLeftColor: theme('colors.gray.600'),
              paddingLeft: theme('spacing.4'),
              color: theme('colors.gray.300'),
              fontStyle: 'italic',
            },
            code: {
              backgroundColor: theme('colors.gray.800'),
              padding: '0.25rem 0.375rem',
              borderRadius: theme('borderRadius.md'),
            },
            'pre code': {
              backgroundColor: theme('colors.gray.900'),
              padding: theme('spacing.4'),
            },
            table: {
              width: '100%',
              borderCollapse: 'collapse',
            },
            'thead th': {
              borderBottom: `2px solid ${theme('colors.gray.600')}`,
              padding: `${theme('spacing.2')} ${theme('spacing.3')}`,
            },
            'tbody td': {
              borderBottom: `1px solid ${theme('colors.gray.700')}`,
              padding: `${theme('spacing.2')} ${theme('spacing.3')}`,
            },
          },
        },
        // ダークモード用バリアント（prose-invert）
        invert: {
          css: {
            color: theme('colors.white'),
            a: { color: theme('colors.blue.200') },
            blockquote: { borderLeftColor: theme('colors.gray.500'), color: theme('colors.gray.300') },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
