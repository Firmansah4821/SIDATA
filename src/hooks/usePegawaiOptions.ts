import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { namaPegawaiOptions as fallbackNames } from '@/lib/sidata-config';

export interface PegawaiOption {
  id: string;
  name: string;
}

const sortNames = (names: string[]) =>
  [...new Set(names)].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }));

export function usePegawaiOptions() {
  const [items, setItems] = useState<PegawaiOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pegawai_options' as any)
      .select('id, name')
      .order('name', { ascending: true });
    if (error) {
      console.error('Gagal memuat daftar pegawai:', error);
      setItems([]);
    } else {
      setItems(((data as any) || []) as PegawaiOption[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchItems();
    const channel = supabase
      .channel('pegawai_options_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pegawai_options' },
        () => void fetchItems(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const add = async (name: string) => {
    const clean = name.trim();
    if (!clean) throw new Error('Nama tidak boleh kosong');
    const { error } = await supabase.from('pegawai_options' as any).insert({ name: clean });
    if (error) throw new Error(error.message.includes('duplicate') ? 'Nama sudah ada di daftar' : error.message);
  };

  const update = async (id: string, name: string) => {
    const clean = name.trim();
    if (!clean) throw new Error('Nama tidak boleh kosong');
    const { error } = await supabase.from('pegawai_options' as any).update({ name: clean }).eq('id', id);
    if (error) throw new Error(error.message.includes('duplicate') ? 'Nama sudah ada di daftar' : error.message);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('pegawai_options' as any).delete().eq('id', id);
    if (error) throw new Error(error.message);
  };

  // Names list merged with the static fallback so the form still works even if the table is empty or unreachable.
  const names = sortNames(items.length > 0 ? items.map(i => i.name) : fallbackNames);

  return { items, names, loading, add, update, remove, refresh: fetchItems };
}