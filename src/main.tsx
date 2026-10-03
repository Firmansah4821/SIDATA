import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./lib/theme";

// Pulihkan pilihan Tema & Warna (mode + aksen) sebelum aplikasi dirender.
initTheme();

createRoot(document.getElementById("root")!).render(<App />);
