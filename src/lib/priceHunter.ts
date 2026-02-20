import { supabase } from '@/lib/supabaseClient';

export type Unit = '1Kg' | '1L' | 'Docena' | 'Unidad';

/** Tipo de oferta predefinida o personalizada */
export type OfferType = '2x1' | '3x2' | '50_second' | 'custom' | null;

export interface PriceEntry {
  id: string;
  user_id: string;
  product_name: string;
  brand?: string | null;
  total_price: number;
  quantity: number;
  unit: Unit;
  supermarket: string;
  date: string;
  created_at?: string;
  updated_at?: string | null;
  /** Tipo de oferta: 2x1, 3x2, 50_second, custom o null */
  offer_type?: OfferType | null;
  /** Nombre de la oferta (solo si offer_type = custom) */
  offer_name?: string | null;
  /** Descripción de la oferta (solo si offer_type = custom) */
  offer_description?: string | null;
}

export interface PriceInput {
  product_name: string;
  brand: string;
  total_price: number;
  quantity: number;
  unit: Unit;
  supermarket: string;
  date: string;
  offer_type?: OfferType | null;
  offer_name?: string | null;
  offer_description?: string | null;
}

/**
 * Calcula el precio normalizado según la unidad seleccionada
 * @param totalPrice - Precio total pagado
 * @param quantity - Cantidad del producto (en gramos, ml o unidades)
 * @param unit - Unidad de normalización
 * @returns Precio normalizado por unidad
 */
export function calculateNormalizedPrice(
  totalPrice: number,
  quantity: number,
  unit: Unit | string // Permitir string para compatibilidad con datos antiguos
): number {
  if (quantity <= 0) return 0;

  switch (unit) {
    case '1Kg':
    case '1L': {
      const pricePerUnit = totalPrice / quantity;
      return pricePerUnit * 1000;
    }
    case 'Docena': {
      // Cuando la unidad es Docena, quantity representa unidades individuales
      // El precio normalizado es: totalPrice / (quantity / 12)
      // Ejemplo: 6€ / (24 unidades / 12) = 6€ / 2 docenas = 3€/docena
      const docenas = quantity / 12;
      if (docenas <= 0) return 0;
      return totalPrice / docenas;
    }
    case 'Unidad': {
      // Cuando la unidad es Unidad, quantity representa unidades individuales
      // El precio normalizado es: totalPrice / quantity
      // Ejemplo: 3€ / 2 unidades = 1.5€/unidad
      return totalPrice / quantity;
    }
    // Compatibilidad con datos antiguos (100g, 100ml)
    case '100g':
    case '100ml': {
      const pricePerUnit = totalPrice / quantity;
      return pricePerUnit * 100;
    }
    default:
      return 0;
  }
}

export async function fetchPrices(): Promise<PriceEntry[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PriceEntry[]) ?? [];
}

export async function createPrice(
  userId: string,
  input: PriceInput
): Promise<PriceEntry> {
  const payload = {
    user_id: userId,
    product_name: input.product_name,
    brand: input.brand?.trim() || null,
    total_price: input.total_price,
    quantity: input.quantity,
    unit: input.unit,
    supermarket: input.supermarket,
    date: input.date,
    offer_type: input.offer_type ?? null,
    offer_name: input.offer_name?.trim() || null,
    offer_description: input.offer_description?.trim() || null,
  };

  const { data, error } = await supabase
    .from('price_hunter_prices')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as PriceEntry;
}

export async function updatePrice(
  id: string,
  input: PriceInput
): Promise<PriceEntry> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .update({
      product_name: input.product_name,
      brand: input.brand?.trim() || null,
      total_price: input.total_price,
      quantity: input.quantity,
      unit: input.unit,
      supermarket: input.supermarket,
      date: input.date,
      offer_type: input.offer_type ?? null,
      offer_name: input.offer_name?.trim() || null,
      offer_description: input.offer_description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as PriceEntry;
}

export async function deletePrice(id: string): Promise<void> {
  const { error } = await supabase
    .from('price_hunter_prices')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function fetchUniqueProductNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select('product_name')
    .order('product_name', { ascending: true });

  if (error) {
    throw error;
  }

  // Obtener nombres únicos
  const uniqueNames = [...new Set(data.map((item) => item.product_name))];
  return uniqueNames;
}

export async function fetchUniqueBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select('brand')
    .order('brand', { ascending: true });

  if (error) {
    throw error;
  }

  const unique = [...new Set((data ?? []).map((item) => item.brand).filter((b): b is string => b != null && b.trim() !== ''))];
  return unique.sort((a, b) => a.localeCompare(b));
}

export async function fetchUniqueSupermarkets(): Promise<string[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select('supermarket')
    .order('supermarket', { ascending: true });

  if (error) {
    throw error;
  }

  const unique = [...new Set((data ?? []).map((item) => item.supermarket))];
  return unique.sort((a, b) => a.localeCompare(b));
}

/**
 * Obtiene todos los precios históricos de un producto específico
 * @param productName - Nombre del producto a buscar
 * @returns Array de precios ordenados por fecha descendente
 */
export async function fetchPricesByProduct(
  productName: string
): Promise<PriceEntry[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select('*')
    .eq('product_name', productName)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PriceEntry[]) ?? [];
}

/**
 * Obtiene todos los precios históricos registrados en un supermercado específico
 * @param supermarket - Nombre del supermercado a buscar
 * @returns Array de precios ordenados por fecha descendente
 */
export async function fetchPricesBySupermarket(
  supermarket: string
): Promise<PriceEntry[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select('*')
    .eq('supermarket', supermarket)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PriceEntry[]) ?? [];
}
