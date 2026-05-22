import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(value: string) {
  if (!value) return "";
  const v = value.replace(/\D/g, "").slice(0, 11);
  if (v.length >= 11) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  } else if (v.length >= 7) {
    return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  } else if (v.length >= 3) {
    return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  }
  return v ? `(${v}` : '';
}
