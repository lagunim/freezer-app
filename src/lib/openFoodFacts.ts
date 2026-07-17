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
    return { quantity: Math.round(Number.parseFloat(gMatch[1].replace(",", "."))), unit: "1Kg" };
  }

  const kgMatch = lower.match(/([\d.,]+)\s*kg(?:\s|$)/);
  if (kgMatch) {
    return { quantity: Math.round(Number.parseFloat(kgMatch[1].replace(",", ".")) * 1000), unit: "1Kg" };
  }

  // Volumen: ml, cl o L → quantity en mililitros
  const mlMatch = lower.match(/([\d.,]+)\s*ml(?:\s|$)/);
  if (mlMatch) {
    return { quantity: Math.round(Number.parseFloat(mlMatch[1].replace(",", "."))), unit: "1L" };
  }

  const clMatch = lower.match(/([\d.,]+)\s*cl(?:\s|$)/);
  if (clMatch) {
    return { quantity: Math.round(Number.parseFloat(clMatch[1].replace(",", ".")) * 10), unit: "1L" };
  }

  const lMatch = lower.match(/([\d.,]+)\s*l(?:\s|$)/);
  if (lMatch) {
    return { quantity: Math.round(Number.parseFloat(lMatch[1].replace(",", ".")) * 1000), unit: "1L" };
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

/**
 * Busca un producto por código de barras en Open Food Facts.
 */
export async function lookupByBarcode(barcode: string): Promise<OffLookupResult> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,quantity`,
    );

    if (!res.ok) {
      return { found: false };
    }

    const data: OffApiResponse = await res.json();

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
  } catch {
    return { found: false };
  }
}
