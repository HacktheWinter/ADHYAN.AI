import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import "./api/axios";
import "./index.css";

const normalizeHashRoute = () => {
  const { hash, pathname, search } = window.location;
  if (!hash.startsWith("#/")) return;

  const [hashPath, hashSearch = ""] = hash.slice(1).split("?");
  const normalizedUrl = `${hashPath}${hashSearch ? `?${hashSearch}` : ""}`;

  if (`${pathname}${search}` !== normalizedUrl) {
    window.history.replaceState(null, "", normalizedUrl);
  }
};

normalizeHashRoute();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: "14px",
            fontWeight: 600,
            borderRadius: "12px",
            padding: "12px 16px",
            boxShadow: "0 8px 32px -4px rgba(26,19,37,0.18)",
          },
          success: {
            iconTheme: { primary: "#6D28D9", secondary: "#F1ECFB" },
          },
          error: {
            iconTheme: { primary: "#EF4444", secondary: "#FEE2E2" },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
