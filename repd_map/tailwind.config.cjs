module.exports = {
    content: ['./src/**/*.{html,svelte,js,ts,css}'],
    theme: {
      extend: {
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif']
        }
      },
    },  
    plugins: [require("@tailwindcss/typography"), require('daisyui')],
    daisyui: {
      themes: true, // true: all themes | false: only light + dark | array: specific themes like ["light", "dark", "cupcake"]
      darkTheme: "emerald", // name of one of the included themes for dark mode
    }
  };
  