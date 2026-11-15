/// <reference types="vite/client" />
// Backend ka address ek hi jagah. Baad me deploy karte waqt sirf yahan (ya VITE_API_URL env me) badalna hai.
export const API: string =
  ((import.meta as any).env?.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:4000";

// Server ke /api/download route ka link: Content-Disposition: attachment ki wajah se
// click karte hi file seedha Downloads folder me save hoti hai (video tab me nahi khulti).
export const downloadHref = (output: string, filename: string) => {
  const file = output.replace(/^\/renders\//, "").split("?")[0];
  return `${API}/api/download/${encodeURIComponent(file)}?name=${encodeURIComponent(filename)}`;
};
