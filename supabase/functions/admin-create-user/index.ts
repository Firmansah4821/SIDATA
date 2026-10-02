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

    // Verify caller is admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseUser.auth.getUser();
    if (!caller) throw new Error("Not authenticated");

    // Check admin role
    const { data: roleData } = await supabaseUser.from("user_roles").select("role").eq("user_id", caller.id);
    const isAdmin = (roleData || []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Unauthorized: Admin only");

    const { username, email, password, full_name, jabatan, role } = await req.json();
    if (!username || !password || !full_name) throw new Error("Missing required fields");

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error("Username hanya boleh berisi huruf, angka, dan underscore");
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check duplicate username
    const { data: existingUsername } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("username", username)
      .maybeSingle();

    if (existingUsername) {
      throw new Error("Username sudah terdaftar. Silakan gunakan username lain.");
    }

    // Determine auth email
    const authEmail = role === "admin" && email ? email : `${username}@sidata.local`;

    // For admin role, check duplicate email
    if (role === "admin" && email) {
      const { data: existingEmail } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (existingEmail) {
        throw new Error("Email sudah terdaftar. Silakan gunakan email lain.");
      }
    }

    // Check if auth email already exists in auth.users
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const emailTaken = existingAuthUsers?.users?.some(u => u.email === authEmail);
    if (emailTaken) {
      throw new Error("Username/email sudah terdaftar. Silakan gunakan yang lain.");
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, username },
    });

    if (createError) throw createError;

    if (newUser.user) {
      // Update profile with username and email
      await supabaseAdmin
        .from("profiles")
        .update({
          jabatan: jabatan || null,
          username: username,
          email: role === "admin" && email ? email : authEmail,
        })
        .eq("user_id", newUser.user.id);

      // If role is admin, update the role
      if (role === "admin") {
        await supabaseAdmin.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.user.id);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
