import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    const { data: roleData } = await supabaseUser.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = (roleData || []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Unauthorized: Admin only");

    const { user_id, full_name, jabatan, username, password } = await req.json();
    if (!user_id) throw new Error("Missing user_id");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check duplicate username if changed
    if (username) {
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error("Username hanya boleh berisi huruf, angka, dan underscore");
      }
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("username", username)
        .neq("user_id", user_id)
        .maybeSingle();
      if (existing) {
        throw new Error("Username sudah terdaftar. Silakan gunakan username lain.");
      }
    }

    // Update profile
    const profileUpdate: any = {};
    if (full_name !== undefined) profileUpdate.full_name = full_name;
    if (jabatan !== undefined) profileUpdate.jabatan = jabatan;
    if (username !== undefined) profileUpdate.username = username;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", user_id);
      if (pErr) throw pErr;
    }

    // Update password if provided
    if (password && password.length >= 6) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });
      if (authErr) throw authErr;
    }

    // Update auth email if username changed (for operators with @sidata.local)
    if (username) {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (userData?.user?.email?.endsWith("@sidata.local")) {
        await supabaseAdmin.auth.admin.updateUserById(user_id, {
          email: `${username}@sidata.local`,
          email_confirm: true,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Update user error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
