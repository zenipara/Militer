import { supabase } from '../supabase';
import type { Document } from '../../types';

export async function fetchDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*, uploader:uploaded_by(id,nama,nrp)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Document[]) ?? [];
}

export async function insertDocument(data: {
  nama: string;
  kategori?: string | null;
  file_url: string;
  satuan?: string | null;
  file_size?: number | null;
}): Promise<void> {
  const { error } = await supabase.from('documents').insert(data);
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}
