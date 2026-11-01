"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/**
 * Renders children into document.body so overlays escape any animated
 * ancestor that would otherwise become their containing block / stacking
 * context (which traps them under the bottom navigation).
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
