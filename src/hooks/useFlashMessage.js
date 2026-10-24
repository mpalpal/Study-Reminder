import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 数秒で自動的に消えるメッセージ。
 * flash(text) で表示、flash(text, { persist: true }) で消えずに残る。
 */
export function useFlashMessage(duration = 2000) {
  const [message, setMessage] = useState("");
  const timer = useRef();

  const flash = useCallback(
    (text, { persist = false } = {}) => {
      clearTimeout(timer.current);
      setMessage(text);
      if (!persist) timer.current = setTimeout(() => setMessage(""), duration);
    },
    [duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return [message, flash];
}
