// Har File ko ek stable id milti hai. Project me files isi id se save hoti hain,
// aur load karte waqt wahi id wapas File ko de di jati hai (taaki dobara upload na ho).
const ids = new WeakMap<File, string>();

export const mediaIdOf = (file: File): string => {
  let id = ids.get(file);
  if (!id) {
    id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 40);
    ids.set(file, id);
  }
  return id;
};

export const assignMediaId = (file: File, id: string): File => {
  ids.set(file, id);
  return file;
};
