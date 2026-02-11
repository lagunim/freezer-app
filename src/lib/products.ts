import { supabase } from '@/lib/supabaseClient';

export type ProductCategory = 'Limpieza' | 'Alimentación' | 'Mascotas';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  /**
   * Unidad de la cantidad (ej. "g", "ml", "uds").
   */
  quantity_unit: string;
  /**
   * Categoría del producto.
   */
  category: ProductCategory;
  added_at: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface ProductInput {
  name: string;
  quantity: number;
  /**
   * Unidad de la cantidad (ej. "g", "ml", "uds").
   */
  quantity_unit: string;
  /**
   * Categoría del producto.
   */
  category: ProductCategory;
  /**
   * Fecha en ISO (por ejemplo, '2024-01-31' o '2024-01-31T00:00:00Z').
   */
  added_at: string;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('added_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as Product[]) ?? [];
}

export async function createProduct(
  userId: string,
  input: ProductInput
): Promise<Product> {
  const payload = {
    user_id: userId,
    name: input.name,
    quantity: input.quantity,
    quantity_unit: input.quantity_unit,
    category: input.category,
    added_at: input.added_at,
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Product;
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update({
      name: input.name,
      quantity: input.quantity,
      quantity_unit: input.quantity_unit,
      category: input.category,
      added_at: input.added_at,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

