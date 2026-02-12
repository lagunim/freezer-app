import { supabase } from '@/lib/supabaseClient';

export type Unit = '100g' | '1Kg' | '100ml' | '1L';

export interface PriceEntry {
  id: string;
  user_id: string;
  product_name: string;
  total_price: number;
  quantity: number;
  unit: Unit;
  supermarket: string;
  date: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface PriceInput {
  product_name: string;
  total_price: number;
  quantity: number;
  unit: Unit;
  supermarket: string;
  date: string;
}

/**
 * Calcula el precio normalizado según la unidad seleccionada
 * @param totalPrice - Precio total pagado
 * @param quantity - Cantidad del producto (en gramos o ml)
 * @param unit - Unidad de normalización
 * @returns Precio normalizado por unidad
 */
export function calculateNormalizedPrice(
  totalPrice: number,
  quantity: number,
  unit: Unit
): number {
  if (quantity <= 0) return 0;

  const pricePerUnit = totalPrice / quantity;

  switch (unit) {
    case '100g':
    case '100ml':
      return pricePerUnit * 100;
    case '1Kg':
    case '1L':
      return pricePerUnit * 1000;
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
    total_price: input.total_price,
    quantity: input.quantity,
    unit: input.unit,
    supermarket: input.supermarket,
    date: input.date,
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
      total_price: input.total_price,
      quantity: input.quantity,
      unit: input.unit,
      supermarket: input.supermarket,
      date: input.date,
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
