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

    const { user_id } = await req.json();
    if (!user_id) throw new Error("Missing user_id");

    if (user_id === caller.id) throw new Error("Tidak dapat menghapus akun Anda sendiri");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Clean up database records first (ignore errors for missing data)
    try { await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id); } catch {}
    try { await supabaseAdmin.from("profiles").delete().eq("user_id", user_id); } catch {}

    // Delete from auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (error) {
      // If user not found in auth, that's ok - already deleted
      if (!error.message?.includes("not found") && !error.message?.includes("User not found")) {
        throw error;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Delete user error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
