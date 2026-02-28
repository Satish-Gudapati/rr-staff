import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with caller's token to verify they're an owner
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is an owner
    const { data: callerProfile } = await supabaseAuth.from('profiles').select('*').eq('user_id', caller.id).eq('role', 'owner').single();
    if (!callerProfile) {
      return new Response(JSON.stringify({ error: 'Only owners can manage employees' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, ...payload } = await req.json();

    // Admin client for user creation
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'create') {
      const { email, password, full_name, permissions } = payload;

      // Create auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: 'employee' },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create profile
      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').insert({
        user_id: newUser.user.id,
        full_name,
        email,
        role: 'employee',
        owner_id: callerProfile.id,
      }).select().single();

      if (profileError) {
        // Cleanup: delete the auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Assign permissions
      if (permissions && permissions.length > 0) {
        const permRows = permissions.map((permId: string) => ({
          profile_id: profile.id,
          permission_id: permId,
          granted_by: callerProfile.id,
        }));
        await supabaseAdmin.from('employee_permissions').insert(permRows);
      }

      return new Response(JSON.stringify({ success: true, profile }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      const { profile_id, full_name, email, is_active, permissions } = payload;

      // Verify employee belongs to this owner
      const { data: empProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', profile_id).eq('owner_id', callerProfile.id).single();
      if (!empProfile) {
        return new Response(JSON.stringify({ error: 'Employee not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update profile
      const updates: Record<string, unknown> = {};
      if (full_name) updates.full_name = full_name;
      if (email) updates.email = email;
      if (typeof is_active === 'boolean') updates.is_active = is_active;

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('profiles').update(updates).eq('id', profile_id);
      }

      // Update email in auth if changed
      if (email && email !== empProfile.email) {
        await supabaseAdmin.auth.admin.updateUserById(empProfile.user_id, { email });
      }

      // Update permissions: delete old, insert new
      if (permissions !== undefined) {
        await supabaseAdmin.from('employee_permissions').delete().eq('profile_id', profile_id);
        if (permissions.length > 0) {
          const permRows = permissions.map((permId: string) => ({
            profile_id,
            permission_id: permId,
            granted_by: callerProfile.id,
          }));
          await supabaseAdmin.from('employee_permissions').insert(permRows);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'delete') {
      const { profile_id } = payload;

      const { data: empProfile } = await supabaseAdmin.from('profiles').select('*').eq('id', profile_id).eq('owner_id', callerProfile.id).single();
      if (!empProfile) {
        return new Response(JSON.stringify({ error: 'Employee not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete auth user (cascades to profile via FK)
      await supabaseAdmin.auth.admin.deleteUser(empProfile.user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
