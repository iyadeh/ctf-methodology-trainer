"use client";

import { useEffect } from "react";

/**
 * Synchronizes client-side localStorage preferences (density, reduced-motion)
 * on mount without injecting inline script tags into React component trees.
 */
export function ThemeSynchronizer() {
  useEffect(() => {
    try {
      const density = localStorage.getItem("ctf-methodology-density");
      if (density) {
        document.documentElement.setAttribute("data-density", density);
      }

      const reducedMotion = localStorage.getItem("ctf-methodology-reduced-motion");
      if (reducedMotion === "true") {
        document.documentElement.classList.add("reduced-motion");
      }
    } catch {
      // Ignore localStorage permission or access errors
    }
  }, []);

  return null;
}
