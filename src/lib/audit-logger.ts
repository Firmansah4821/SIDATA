import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout';
export type AuditTargetType = 'record' | 'user' | 'profile' | 'session';

export async function logAudit(
  action: AuditAction,
  targetType: AuditTargetType,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name' as any)
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase.from('audit_logs' as any).insert({
      user_id: user.id,
      user_name: (profile as any)?.full_name || user.email || 'Unknown',
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || {},
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}
