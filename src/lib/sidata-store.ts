import { supabase } from '@/integrations/supabase/client';
import { SidataRecord, AdminAccount, DataType } from './sidata-config';

// ─── Records ───

export async function loadRecords(): Promise<SidataRecord[]> {
  const { data, error } = await supabase
    .from('sidata_records')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('loadRecords error:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    type: row.type as DataType,
    submitted_at: row.submitted_at,
    ...(row.data as Record<string, any>),
  }));
}

// Load records for a single category only — much faster for Laporan view
export async function loadRecordsByType(type: DataType): Promise<SidataRecord[]> {
  const { data, error } = await supabase
    .from('sidata_records')
    .select('*')
    .eq('type', type)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('loadRecordsByType error:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    type: row.type as DataType,
    submitted_at: row.submitted_at,
    ...(row.data as Record<string, any>),
  }));
}

export async function addRecord(record: Omit<SidataRecord, 'id'>): Promise<SidataRecord | null> {
  const { type, submitted_at, ...rest } = record;
  const { data, error } = await supabase
    .from('sidata_records')
    .insert({ type, submitted_at, data: rest })
    .select()
    .maybeSingle();

  if (error) {
    console.error('addRecord error:', error);
    throw new Error(error.message || 'Gagal menyimpan ke database');
  }
  if (!data) return null;

  return {
    id: data.id,
    type: data.type as DataType,
    submitted_at: data.submitted_at,
    ...(data.data as Record<string, any>),
  };
}

export async function deleteRecord(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('sidata_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteRecord error:', error);
    return false;
  }
  return true;
}

export async function updateRecord(id: string, record: Omit<SidataRecord, 'id'>): Promise<SidataRecord | null> {
  const { type, submitted_at, ...rest } = record;
  const { data, error } = await supabase
    .from('sidata_records')
    .update({ type, data: rest })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('updateRecord error:', error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    type: data.type as DataType,
    submitted_at: data.submitted_at,
    ...(data.data as Record<string, any>),
  };
}

export function getStats(records: SidataRecord[]): Record<DataType, number> {
  const stats: Record<DataType, number> = {
    surat_masuk: 0, surat_keluar: 0, buku_tamu: 0, inventaris_dokumen: 0,
    pengajuan_bpn: 0, perjalanan_dinas: 0, agenda_rapat: 0, lembur: 0,
  };
  records.forEach(r => { if (stats[r.type] !== undefined) stats[r.type]++; });
  return stats;
}

// ─── Conflict recompute for perjalanan_dinas ───
// Re-evaluates conflict_flag for every perjalanan_dinas row on the given date(s).
// Call after insert/update/delete of perjalanan_dinas so that previously-bentrok
// rows automatically clear their flag when the conflicting peer is fixed.
function parsePelakuRaw(raw: any): string[] {
  const s = String(raw || '').trim();
  if (!s) return [];
  if (s.includes('|')) return s.split('|').map(x => x.trim()).filter(Boolean);
  return s.split(/[;\n,]+/).map(x => x.trim()).filter(Boolean);
}

export async function recomputeConflictsForDate(dates: string | string[]): Promise<void> {
  const dateList = Array.from(new Set((Array.isArray(dates) ? dates : [dates]).filter(Boolean)));
  if (dateList.length === 0) return;

  const { data: rows, error } = await supabase
    .from('sidata_records')
    .select('id, data')
    .eq('type', 'perjalanan_dinas');
  if (error || !rows) return;

  // Filter to rows whose date matches any of the given dates
  const relevant = rows.filter((r: any) => dateList.includes((r.data || {}).tanggal_perjalanan));

  for (const row of relevant) {
    const d: any = row.data || {};
    const date = d.tanggal_perjalanan;
    const kec = (d.tujuan_perjalanan || '').trim();
    const desa = (d.desa_perjalanan || '').trim();
    const pelaku = parsePelakuRaw(d.pelaku_perjalanan);

    const conflicts: Array<{ name: string; kec: string; desa: string }> = [];
    const seen = new Set<string>();
    for (const other of rows) {
      if (other.id === row.id) continue;
      const od: any = other.data || {};
      if (od.tanggal_perjalanan !== date) continue;
      const oKec = (od.tujuan_perjalanan || '').trim();
      const oDesa = (od.desa_perjalanan || '').trim();
      if (oKec === kec && oDesa === desa) continue;
      const oPelaku = parsePelakuRaw(od.pelaku_perjalanan);
      for (const name of pelaku) {
        if (!oPelaku.includes(name)) continue;
        const key = `${name}|${oKec}|${oDesa}`;
        if (seen.has(key)) continue;
        seen.add(key);
        conflicts.push({ name, kec: oKec || '-', desa: oDesa || '-' });
      }
    }

    const shouldFlag = conflicts.length > 0;
    const wasFlagged = !!d.conflict_flag;
    const newInfo = shouldFlag
      ? conflicts.map(c => `${c.name} bentrok di ${c.kec}${c.desa && c.desa !== '-' ? ` (${c.desa})` : ''}`).join(' | ')
      : '';

    if (shouldFlag === wasFlagged && (d.conflict_info || '') === newInfo) continue;

    const nextData = { ...d, conflict_flag: shouldFlag, conflict_info: newInfo };
    await supabase.from('sidata_records').update({ data: nextData }).eq('id', row.id);
  }
}

// Lightweight stats-only query (no heavy data/base64 blobs)
export async function loadStatsOnly(): Promise<Record<DataType, number>> {
  const stats: Record<DataType, number> = {
    surat_masuk: 0, surat_keluar: 0, buku_tamu: 0, inventaris_dokumen: 0,
    pengajuan_bpn: 0, perjalanan_dinas: 0, agenda_rapat: 0, lembur: 0,
  };

  const { data, error } = await supabase
    .from('sidata_records')
    .select('type');

  if (error) {
    console.error('loadStatsOnly error:', error);
    return stats;
  }

  (data || []).forEach((r: any) => {
    if (stats[r.type as DataType] !== undefined) stats[r.type as DataType]++;
  });

  return stats;
}

// ─── Admins ───

export async function loadAdmins(): Promise<AdminAccount[]> {
  const { data, error } = await supabase
    .from('admin_accounts')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('loadAdmins error:', error);
    return [{ username: 'admin', password: 'admin123' }];
  }

  return (data || []).map(row => ({
    username: row.username,
    password: row.password_hash,
  }));
}

export async function saveAdmins(admins: AdminAccount[]): Promise<void> {
  // Delete all then re-insert (simple approach)
  await supabase.from('admin_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const rows = admins.map(a => ({ username: a.username, password_hash: a.password }));
  if (rows.length > 0) {
    const { error } = await supabase.from('admin_accounts').insert(rows);
    if (error) console.error('saveAdmins error:', error);
  }
}
