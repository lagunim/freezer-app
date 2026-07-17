import type { Unit } from "@/lib/priceHunter";

interface OffApiResponse {
  status: number;
  product?: {
    product_name?: string;
    brands?: string;
    quantity?: string;
  };
}

export interface OffLookupResult {
  found: boolean;
  product_name?: string;
  brand?: string;
  quantity?: number;
  unit?: Unit;
}

const API_BASES = [
  "https://world.openfoodfacts.org",      // Alimentos
  "https://world.openbeautyfacts.org",    // Higiene / cosméticos
  "https://world.openproductsfacts.org",  // Limpieza / otros
];

const FIELDS = "product_name,brands,quantity";

/**
 * Parsea el campo quantity de Open Food Facts (ej: "250 g", "1 L", "6 x 33 cl")
 * y lo convierte a quantity + unit del sistema local.
 */
function parseOffQuantity(raw: string): { quantity?: number; unit?: Unit } {
  const lower = raw.toLowerCase().trim();

  // Patrón "N x M unit" (packs) → unidad, quantity = primer número
  const packMatch = lower.match(/^(\d+)\s*x\s*[\d.,]+\s*(cl|ml|l|g|kg|unidades?|uds?)?/);
  if (packMatch) {
    return { quantity: Number.parseInt(packMatch[1], 10), unit: "Unidad" };
  }

  // Peso: g o kg → quantity en gramos
  const gMatch = lower.match(/([\d.,]+)\s*g(?:\s|$)/);
  if (gMatch) {
    return { quantity: Math.round(Number.parseFloat(gMatch[1].replace(",", "."))), unit: "Kg" };
  }

  const kgMatch = lower.match(/([\d.,]+)\s*kg(?:\s|$)/);
  if (kgMatch) {
    return { quantity: Math.round(Number.parseFloat(kgMatch[1].replace(",", ".")) * 1000), unit: "Kg" };
  }

  // Volumen: ml, cl o L → quantity en mililitros
  const mlMatch = lower.match(/([\d.,]+)\s*ml(?:\s|$)/);
  if (mlMatch) {
    return { quantity: Math.round(Number.parseFloat(mlMatch[1].replace(",", "."))), unit: "L" };
  }

  const clMatch = lower.match(/([\d.,]+)\s*cl(?:\s|$)/);
  if (clMatch) {
    return { quantity: Math.round(Number.parseFloat(clMatch[1].replace(",", ".")) * 10), unit: "L" };
  }

  const lMatch = lower.match(/([\d.,]+)\s*l(?:\s|$)/);
  if (lMatch) {
    return { quantity: Math.round(Number.parseFloat(lMatch[1].replace(",", ".")) * 1000), unit: "L" };
  }

  // Unidades
  const udsMatch = lower.match(/([\d.,]+)\s*(?:unidades?|uds?)(?:\s|$)/);
  if (udsMatch) {
    return { quantity: Math.round(Number.parseFloat(udsMatch[1].replace(",", "."))), unit: "Unidad" };
  }

  // Si solo hay un número, asumir unidades
  const numMatch = lower.match(/^([\d.,]+)$/);
  if (numMatch) {
    return { quantity: Math.round(Number.parseFloat(numMatch[1].replace(",", "."))), unit: "Unidad" };
  }

  return {};
}

function parseApiResponse(data: OffApiResponse): OffLookupResult {
  if (data.status !== 1 || !data.product) {
    return { found: false };
  }

  const { product_name, brands, quantity } = data.product;

  if (!product_name) {
    return { found: false };
  }

  const parsed = quantity ? parseOffQuantity(quantity) : {};

  return {
    found: true,
    product_name: product_name.trim(),
    brand: brands?.split(",")[0]?.trim() ?? undefined,
    quantity: parsed.quantity,
    unit: parsed.unit ?? "Unidad",
  };
}

/**
 * Busca un producto por código de barras en Open Food Facts,
 * Open Beauty Facts y Open Products Facts (en paralelo).
 * Retorna el primer resultado encontrado.
 */
export async function lookupByBarcode(barcode: string): Promise<OffLookupResult> {
  const urls = API_BASES.map(
    (base) => `${base}/api/v2/product/${barcode}?fields=${FIELDS}`,
  );

  const results = await Promise.allSettled(
    urls.map((url) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      const parsed = parseApiResponse(result.value);
      if (parsed.found) {
        return parsed;
      }
    }
  }

  return { found: false };
}
