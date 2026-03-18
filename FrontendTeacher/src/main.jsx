import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
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
    </BrowserRouter>
  </React.StrictMode>
);
