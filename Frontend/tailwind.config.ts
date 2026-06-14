import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0a1f14",
        night: "#070b14",
        neon: "#39ff14",
        electric: "#00e0ff",
        gold: "#ffd24a"
      },
      keyframes: {
        spin3d: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" }
        }
      },
      animation: { spin3d: "spin3d 3s linear infinite" }
    }
  },
  plugins: []
};
export default config;
