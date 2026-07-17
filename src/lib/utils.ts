/** Normaliza un string: lowercase + elimina tildes/diacríticos */
export function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
