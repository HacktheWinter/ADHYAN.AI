import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
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
    <QueryClientProvider client={new QueryClient()}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
