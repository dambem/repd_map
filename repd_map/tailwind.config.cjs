module.exports = {
    content: ['./src/**/*.{svelte,js,ts}'],
    theme: {
      extend: {},
    },  
    plugins: [require('daisyui')],
    daisyui: {
      themes: true, // true: all themes | false: only light + dark | array: specific themes like ["light", "dark", "cupcake"]
      darkTheme: "dark", // name of one of the included themes for dark mode
    }
  };
  