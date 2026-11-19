import React from "react";
import { createRoot } from "react-dom/client";
import Shell from "./Shell";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Shell />
  </React.StrictMode>,
);

new EventSource("http://localhost:4000/api/alive");
