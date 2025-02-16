module.exports = {
    content: ['./src/**/*.{html,svelte,js,ts}'],
    theme: {
      extend: {},
    },  
    plugins: [require("@tailwindcss/typography"), require('daisyui')],
    daisyui: {
      themes: true, // true: all themes | false: only light + dark | array: specific themes like ["light", "dark", "cupcake"]
      darkTheme: "coffee", // name of one of the included themes for dark mode
    }
  };
  