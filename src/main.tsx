import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "./lib/sentry";
import { validateEnv } from "./lib/envValidation";

// Validate environment variables at startup
validateEnv();

// Initialize Sentry for production error tracking
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
