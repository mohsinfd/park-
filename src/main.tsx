import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress Supabase auth storage errors in restricted browser contexts (e.g. iframes).
// These are non-blocking — card data loads via direct API calls in dev, Supabase edge functions in prod.
window.addEventListener("unhandledrejection", (event) => {
  if (event.reason?.message?.includes("Access to storage is not allowed")) {
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
