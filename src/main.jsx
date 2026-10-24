import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// スプラッシュ画面：読み込み完了の1秒後にフェードアウト
window.addEventListener("load", () => {
  setTimeout(() => document.getElementById("splash")?.classList.add("hide"), 1000);
});
