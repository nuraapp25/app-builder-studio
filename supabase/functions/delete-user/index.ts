import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requester is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requester) {
      throw new Error("Unauthorized");
    }

    // Check if requester is an admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id)
      .single();

    if (roleError || !roleData || roleData.role !== "admin") {
      throw new Error("Unauthorized: Only admins can delete users");
    }

    const { userId }: DeleteUserRequest = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Don't allow deleting yourself
    if (userId === requester.id) {
      throw new Error("You cannot delete your own account");
    }

    // Check if target user is an admin (prevent deleting admins)
    const { data: targetRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (targetRole?.role === "admin") {
      throw new Error("Cannot delete admin users");
    }

    // Delete the user using admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
