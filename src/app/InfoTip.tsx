import React, { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

// Chhota (i) button: dabane pe samjhane wala popover. <span> hai (button nahi) taaki
// <fieldset disabled> ke andar (lock ke time) bhi padha ja sake.
export const InfoTip: React.FC<{
  title?: string;
  children: React.ReactNode;
  align?: "left" | "right";
}> = ({ title, children, align = "left" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex align-middle normal-case tracking-normal font-normal">
      <span
        role="button"
        tabIndex={0}
        aria-label={title ? `About ${title}` : "More info"}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen((o) => !o)}
        className="ml-1.5 text-gray-500 hover:text-[#c4b5fd] cursor-pointer"
      >
        <Info className="w-3.5 h-3.5" />
      </span>
      {open && (
        <span
          className={`absolute z-[70] top-full mt-2 w-64 rounded-xl border border-white/15 bg-[#12121a] p-3 text-xs leading-relaxed text-gray-300 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {title && <span className="block font-bold text-white mb-1">{title}</span>}
          {children}
        </span>
      )}
    </span>
  );
};
