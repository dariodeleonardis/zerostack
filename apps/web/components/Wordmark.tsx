import React from "react";

/** Il marchio: «Zero» in Bodoni nero pieno, «Stack» in corsivo, il punto zafferano. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-2xl leading-none tracking-tight ${className}`}>
      <span className="font-extrabold">Zero</span>
      <span className="italic">Stack</span>
      <span className="text-saffron" aria-hidden>.</span>
    </span>
  );
}
