/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'buggy-primary': '#1e40af',
        'buggy-secondary': '#64748b',
        'buggy-danger': '#dc2626',
        'buggy-success': '#16a34a',
      }
    },
  },
  plugins: [],
}
```

```
