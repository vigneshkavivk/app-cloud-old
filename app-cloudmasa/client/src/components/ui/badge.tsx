import React from "react";

export function Badge({ children, variant }: { children: React.ReactNode, variant?: "default" | "destructive" }) {
  const base = "px-2 py-1 rounded text-white text-sm";
  const color = variant === "destructive" ? "bg-red-500" : "bg-blue-500";
  return <span className={`${base} ${color}`}>{children}</span>;
}
