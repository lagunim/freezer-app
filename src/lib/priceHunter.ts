import { supabase } from '@/lib/supabaseClient';

export type Unit = 'Kg' | 'L' | 'Docena' | 'Unidad';

/** Tipo de oferta predefinida o personalizada */
export type OfferType = '2x1' | '3x2' | '50_second' | 'custom' | null;

/**
 * Precio con datos del producto embebidos (resultado del join con product_prices).
 * Usado por componentes de UI que necesitan datos planos.
 */
export interface PriceEntry {
  id: string;
  user_id: string;
  product_prices_id: string;
  product_name: string;
  brand: string | null;
  total_price: number;
  quantity: number;
  unit: Unit;
  supermarket: string;
  date: string;
  created_at?: string;
  updated_at?: string | null;
  offer_type?: OfferType | null;
  offer_name?: string | null;
  offer_description?: string | null;
  bar_code: string | null;
}

/** Datos para crear un precio. Incluye product_prices_id si el producto ya existe. */
export interface PriceInput {
  product_prices_id?: string;
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
  bar_code?: string;
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
    case 'Kg':
    case '1Kg':
    case 'L':
    case '1L': {
      const pricePerUnit = totalPrice / quantity;
      return pricePerUnit * 1000;
    }
    case 'Docena': {
      const docenas = quantity / 12;
      if (docenas <= 0) return 0;
      return totalPrice / docenas;
    }
    case 'Unidad': {
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

/** Tipo auxiliar para filas crudas del join Supabase */
interface PriceRow {
  id: string;
  user_id: string;
  product_prices_id: string;
  total_price: number;
  supermarket: string;
  date: string;
  offer_type?: string | null;
  offer_name?: string | null;
  offer_description?: string | null;
  created_at?: string;
  updated_at?: string | null;
  product_prices: {
    product_name: string;
    brand: string | null;
    quantity: number;
    unit: string;
    bar_code: string | null;
  } | null;
}

/** Aplana una fila cruda de Supabase en un PriceEntry */
function flattenPriceRow(row: PriceRow): PriceEntry {
  const pp = row.product_prices;
  return {
    id: row.id,
    user_id: row.user_id,
    product_prices_id: row.product_prices_id,
    product_name: pp?.product_name ?? '',
    brand: pp?.brand ?? null,
    total_price: row.total_price,
    quantity: pp?.quantity ?? 0,
    unit: (pp?.unit as Unit) ?? 'Unidad',
    supermarket: row.supermarket,
    date: row.date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    offer_type: (row.offer_type as OfferType) ?? null,
    offer_name: row.offer_name ?? null,
    offer_description: row.offer_description ?? null,
    bar_code: pp?.bar_code ?? null,
  };
}

export async function fetchPrices(): Promise<PriceEntry[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select(`
      id, user_id, product_prices_id, total_price, supermarket, date,
      offer_type, offer_name, offer_description, created_at, updated_at,
      product_prices (product_name, brand, quantity, unit, bar_code)
    `)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PriceRow[]).map(flattenPriceRow);
}

export async function createPrice(
  userId: string,
  input: PriceInput,
): Promise<PriceEntry> {
  const payload = {
    user_id: userId,
    product_prices_id: input.product_prices_id,
    total_price: input.total_price,
    supermarket: input.supermarket,
    date: input.date,
    offer_type: input.offer_type ?? null,
    offer_name: input.offer_name?.trim() || null,
    offer_description: input.offer_description?.trim() || null,
  };

  const { data, error } = await supabase
    .from('price_hunter_prices')
    .insert(payload)
    .select(`
      id, user_id, product_prices_id, total_price, supermarket, date,
      offer_type, offer_name, offer_description, created_at, updated_at,
      product_prices (product_name, brand, quantity, unit, bar_code)
    `)
    .single();

  if (error) {
    throw error;
  }

  return flattenPriceRow(data as PriceRow);
}

export async function updatePrice(
  id: string,
  input: PriceInput,
): Promise<PriceEntry> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .update({
      product_prices_id: input.product_prices_id,
      total_price: input.total_price,
      supermarket: input.supermarket,
      date: input.date,
      offer_type: input.offer_type ?? null,
      offer_name: input.offer_name?.trim() || null,
      offer_description: input.offer_description?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      id, user_id, product_prices_id, total_price, supermarket, date,
      offer_type, offer_name, offer_description, created_at, updated_at,
      product_prices (product_name, brand, quantity, unit, bar_code)
    `)
    .single();

  if (error) {
    throw error;
  }

  return flattenPriceRow(data as PriceRow);
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
 * @param userId - ID del usuario
 * @returns Array de precios ordenados por fecha descendente
 */
export async function fetchPricesByProductName(
  productName: string,
  userId: string,
): Promise<PriceEntry[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select(`
      id, user_id, product_prices_id, total_price, supermarket, date,
      offer_type, offer_name, offer_description, created_at, updated_at,
      product_prices!inner (product_name, brand, quantity, unit, bar_code)
    `)
    .eq('product_prices.product_name', productName)
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PriceRow[]).map(flattenPriceRow);
}

/**
 * Obtiene todos los precios históricos registrados en un supermercado específico
 * @param supermarket - Nombre del supermercado a buscar
 * @returns Array de precios ordenados por fecha descendente
 */
export async function fetchPricesBySupermarket(
  supermarket: string,
): Promise<PriceEntry[]> {
  const { data, error } = await supabase
    .from('price_hunter_prices')
    .select(`
      id, user_id, product_prices_id, total_price, supermarket, date,
      offer_type, offer_name, offer_description, created_at, updated_at,
      product_prices (product_name, brand, quantity, unit, bar_code)
    `)
    .eq('supermarket', supermarket)
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as PriceRow[]).map(flattenPriceRow);
}
