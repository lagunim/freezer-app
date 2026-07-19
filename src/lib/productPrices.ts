import { supabase } from '@/lib/supabaseClient';
import type { Unit } from '@/lib/priceHunter';

export interface ProductPrice {
  id: string;
  user_id: string;
  product_name: string;
  brand: string | null;
  quantity: number;
  unit: Unit;
  bar_code: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface ProductPriceInput {
  product_name: string;
  brand: string;
  quantity: number;
  unit: Unit;
  bar_code?: string | null;
}

export async function fetchProductPrices(): Promise<ProductPrice[]> {
  const { data, error } = await supabase
    .from('product_prices')
    .select('*')
    .order('product_name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as ProductPrice[]) ?? [];
}

export async function createProductPrice(
  userId: string,
  input: ProductPriceInput,
): Promise<ProductPrice> {
  const payload = {
    user_id: userId,
    product_name: input.product_name,
    brand: input.brand?.trim() || null,
    quantity: input.quantity,
    unit: input.unit,
    bar_code: input.bar_code?.trim() || null,
  };

  const { data, error } = await supabase
    .from('product_prices')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as ProductPrice;
}

export async function updateProductPrice(
  id: string,
  input: ProductPriceInput,
): Promise<ProductPrice> {
  const { data, error } = await supabase
    .from('product_prices')
    .update({
      product_name: input.product_name,
      brand: input.brand?.trim() || null,
      quantity: input.quantity,
      unit: input.unit,
      bar_code: input.bar_code?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as ProductPrice;
}

export async function deleteProductPrice(id: string): Promise<void> {
  const { error } = await supabase
    .from('product_prices')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function fetchProductPriceByBarcode(
  barCode: string,
): Promise<ProductPrice | null> {
  const { data, error } = await supabase
    .from('product_prices')
    .select('*')
    .eq('bar_code', barCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProductPrice | null;
}

export async function findExistingProductPrice(
  userId: string,
  input: ProductPriceInput,
): Promise<ProductPrice | null> {
  const brand = input.brand?.trim() || null;

  const { data, error } = await supabase
    .from('product_prices')
    .select('*')
    .eq('user_id', userId)
    .ilike('product_name', input.product_name.trim())
    .eq('quantity', input.quantity)
    .eq('unit', input.unit)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const candidates = (data as ProductPrice[]) ?? [];

  const match = candidates.find((c) => {
    if (brand === null && c.brand === null) return true;
    if (brand === null || c.brand === null) return false;
    return c.brand.toLowerCase() === brand.toLowerCase();
  });

  return match ?? null;
}

export async function updateProductPriceBarCode(
  id: string,
  barCode: string,
): Promise<ProductPrice> {
  const { data, error } = await supabase
    .from('product_prices')
    .update({
      bar_code: barCode.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as ProductPrice;
}

export async function fetchUniqueProductNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_prices')
    .select('product_name')
    .order('product_name', { ascending: true });

  if (error) {
    throw error;
  }

  const uniqueNames = [...new Set(data.map((item) => item.product_name))];
  return uniqueNames;
}

export async function fetchUniqueBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_prices')
    .select('brand')
    .order('brand', { ascending: true });

  if (error) {
    throw error;
  }

  const unique = [
    ...new Set(
      (data ?? [])
        .map((item) => item.brand)
        .filter((b): b is string => b != null && b.trim() !== ''),
    ),
  ];
  return unique.sort((a, b) => a.localeCompare(b));
}
