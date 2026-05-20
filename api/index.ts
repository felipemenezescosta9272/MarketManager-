import express from "express";
import { createClient } from "@supabase/supabase-js";
import { sendConfirmationEmail, sendPasswordResetEmail, sendPasswordChangedEmail } from "./emailService";

// Initialize Supabase Client
console.log("Environment variables:", Object.keys(process.env));
let supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "");
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Supabase Key configured:", !!supabaseServiceKey);

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey && supabaseUrl !== "undefined" && supabaseServiceKey !== "undefined") {
  try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
} else {
  console.error("Supabase configuration missing. URL:", supabaseUrl, "Key:", !!supabaseServiceKey);
}

// Helper to check if user is super admin
const isSuperAdmin = (req: express.Request) => (req as any).is_super_admin;

// Validation Middleware
const validateFields = (fields: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const missing = fields.filter(f => !req.body[f] && req.body[f] !== 0 && req.body[f] !== false);
  if (missing.length > 0) {
    return res.status(400).json({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` });
  }
  next();
};

const app = express();
app.use(express.json());

// In-memory cache for user validation to prevent 429 errors from Supabase
const userCache = new Map<number, { user: any, expires: number }>();
const tenantCache = new Map<number, { tenant: any, expires: number }>();
const CACHE_TTL = 30000; // 30 seconds

app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

// Middleware to check if Supabase is configured
app.use("/api", (req, res, next) => {
  if (!supabase && req.path !== "/health") {
    console.error("Supabase not configured. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    return res.status(503).json({ 
      error: "Servidor não configurado. Por favor, adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do AI Studio (Menu Settings)." 
    });
  }
  if (!supabase && req.path === "/health") {
    return next();
  }
  next();
});

// Request logger
app.use("/api", (req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Securely resolve tenant_id
app.use("/api", async (req, res, next) => {
  const publicPaths = ["/login", "/health", "/auth/forgot-password", "/auth/reset-password", "/auth/confirm-email"];
  const isPublic = publicPaths.some(p => req.path === p || req.path === `/api${p}`);
  
  if (isPublic || !supabase) {
    return next();
  }
  
  const userIdHeader = req.headers['x-user-id'];
  if (!userIdHeader || userIdHeader === 'null' || userIdHeader === 'undefined') {
    console.warn(`Auth Middleware: Invalid x-user-id header (${userIdHeader}) for path ${req.path}`);
    return res.status(401).json({ error: "Usuário não autenticado" });
  }
  
  const userId = Number(userIdHeader);
  if (isNaN(userId)) {
    return res.status(401).json({ error: "ID de usuário inválido" });
  }

  // Check cache first
  const now = Date.now();
  const cachedUser = userCache.get(userId);
  let user;
  
  if (cachedUser && cachedUser.expires > now) {
    user = cachedUser.user;
  } else {
    const { data, error: userErr } = await supabase.from('app_users').select('*').eq('id', userId).maybeSingle();
    if (userErr) {
      console.error(`Auth Middleware DB Error for userId ${userId}:`, userErr);
      return res.status(500).json({ error: "Erro ao validar usuário", details: userErr.message });
    }
    if (!data) {
      console.warn(`Auth Middleware: User ${userId} not found`);
      return res.status(401).json({ error: "Usuário não encontrado" });
    }
    user = data;
    userCache.set(userId, { user, expires: now + CACHE_TTL });
  }

  // Strict separation for Super Admin removed to allow multi-role flexibility
  const userIsSuperAdmin = !!(user.is_super_admin && user.email === "felipemenezes9272@gmail.com");
  (req as any).tenant_id = user.tenant_id;
  (req as any).is_super_admin = userIsSuperAdmin;

  // Check tenant status and license if not super admin
  if (user.tenant_id && !userIsSuperAdmin) {
    let tenant;
    const cachedTenant = tenantCache.get(user.tenant_id);
    
    if (cachedTenant && cachedTenant.expires > now) {
      tenant = cachedTenant.tenant;
    } else {
      let status = 'active';
      let license_end_date = null;

      // Try to get status and license from tenants table first
      let { data, error: tErr } = await supabase.from('tenants').select('status, license_end_date').eq('id', user.tenant_id).maybeSingle();
      
      if (data) {
        status = data.status || 'active';
        license_end_date = data.license_end_date;
      } else {
        // If columns are missing or query failed, try settings table as fallback
        const { data: settings } = await supabase.from('settings')
          .select('key, value')
          .eq('tenant_id', user.tenant_id)
          .in('key', ['status', 'license_end_date']);
        
        if (settings) {
          const statusSetting = settings.find(s => s.key === 'status');
          const licenseSetting = settings.find(s => s.key === 'license_end_date');
          if (statusSetting) status = statusSetting.value;
          if (licenseSetting) license_end_date = licenseSetting.value;
        }
      }
      
      tenant = { status, license_end_date };
      tenantCache.set(user.tenant_id, { tenant, expires: now + CACHE_TTL });
    }

    const isSuspended = tenant.status === 'suspended';
    const isExpired = tenant.license_end_date && new Date(tenant.license_end_date) < new Date();

    if (isSuspended || isExpired) {
      console.warn(`Auth Middleware: Access denied for tenant ${user.tenant_id}. Status: ${tenant.status}, Expired: ${isExpired}`);
      return res.status(403).json({ 
        error: "Acesso suspenso", 
        details: isExpired ? "Sua licença expirou. Por favor, entre em contato com o administrador." : "Sua conta foi suspensa."
      });
    }
  }
  
    console.log(`Auth Middleware: User ${userId} (Tenant: ${user.tenant_id}, SuperAdmin: ${user.is_super_admin}) accessing ${req.path}`);
  
  next();
});

// Helper to get tenant_id from request
const getTenantId = (req: express.Request) => {
  const tid = (req as any).tenant_id;
  return (tid === undefined || tid === null || tid === 'null') ? null : tid;
};

// --- API Routes ---

// Bootstrap Super Admin - Disabled top-level call to prevent Vercel timeouts
const bootstrapAdmin = async () => {
  if (!supabase) {
    console.error("Bootstrap: Supabase client is null");
    return { success: false, error: "Supabase client is null" };
  }
  const results: any[] = [];
  try {
    const admins = [
      { email: "felipemenezes9272@gmail.com", name: "Felipe" }
    ];

    console.log("Starting bootstrap process...");

    // Demote any other user who is erroneously marked as super admin
    try {
      await supabase.from("app_users").update({ is_super_admin: false }).neq("email", "felipemenezes9272@gmail.com");
      console.log("Succeeded in demoting non-master super admins if they existed.");
    } catch (err) {
      console.error("Failed to demote non-master super admins:", err);
    }

    // Ensure at least one tenant exists
    const { count: tenantCount } = await supabase.from("tenants").select("*", { count: 'exact', head: true });
    if (!tenantCount || tenantCount === 0) {
      console.log("No tenants found. Seeding default tenant...");
      const { data: newTenant, error: tErr } = await supabase.from("tenants").insert([{
        name: "Market Manager",
        slug: "market-manager",
        status: "active"
      }]).select().single();
      
      if (tErr) {
        console.error("Error seeding default tenant:", tErr);
      } else {
        console.log("Default tenant seeded:", newTenant.id);
      }
    }

    for (const admin of admins) {
      console.log(`Checking if admin exists: ${admin.email}`);
      const { data: existing, error: checkError } = await supabase
        .from("app_users")
        .select("id, email")
        .eq("email", admin.email)
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking for admin ${admin.email}:`, checkError);
        results.push({ email: admin.email, status: "error_checking", error: checkError });
        continue;
      }

      if (!existing) {
        console.log(`Bootstrapping super admin '${admin.email}'...`);
        
        const { data: inserted, error: insertError } = await supabase.from("app_users").insert([{
          tenant_id: null,
          email: admin.email,
          password: "260892",
          name: admin.name,
          role: "admin",
          is_super_admin: true,
          email_confirmed: true
        }]).select();

        if (insertError) {
          console.error(`Error inserting admin ${admin.email}:`, insertError);
          results.push({ email: admin.email, status: "error_inserting", error: insertError });
        } else {
          console.log(`Successfully bootstrapped admin ${admin.email}`);
          results.push({ email: admin.email, status: "inserted", data: inserted });
        }
      } else {
        console.log(`Admin ${admin.email} already exists. Ensuring super admin status...`);
        const { error: updateError } = await supabase.from("app_users").update({
          is_super_admin: true,
          role: "admin",
          email_confirmed: true
        }).eq("email", admin.email);
        
        if (updateError) {
          console.error(`Error updating admin ${admin.email}:`, updateError);
          results.push({ email: admin.email, status: "error_updating", error: updateError });
        } else {
          results.push({ email: admin.email, status: "updated" });
        }
      }
    }
    console.log("Bootstrap process finished.");
    return { success: true, results };
  } catch (err: any) {
    console.error("Bootstrap unexpected error:", err);
    return { success: false, error: err.message || err };
  }
};

// Route to manually trigger bootstrap if needed
app.get("/api/bootstrap", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  console.log("Manual bootstrap requested");
  const result = await bootstrapAdmin();
  res.json({ message: "Bootstrap process completed.", result });
});

// DEBUG ROUTE - REMOVE IN PRODUCTION
app.get("/api/debug/users", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  console.log("Debug: Fetching all users from app_users");
  const { data, error } = await supabase.from("app_users").select("*");
  if (error) {
    console.error("Debug Users Error:", error);
    return res.status(500).json({ error: error.message });
  }
  res.json({
    count: data?.length || 0,
    users: data
  });
});

app.get("/api/debug/table-info", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
  try {
    const { data, error } = await supabase.from("app_users").select("*").limit(1);
    if (error) {
      return res.status(500).json({ error: error.message, details: error });
    }
    const columns = data && data.length > 0 ? Object.keys(data[0]) : "No data to infer columns";
    res.json({ table: "app_users", columns, sample: data?.[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// LGPD - Data Protection Routes
app.post("/api/lgpd/request-data", async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { type } = req.body; // 'export' or 'delete'
  
  console.log(`LGPD Request: User ${userId} requested ${type} of their data.`);
  
  // In a real system, this would trigger a background process or notify an admin
  // For now, we simulate success
  res.json({ 
    success: true, 
    message: type === 'export' 
      ? "Sua solicitação de exportação de dados foi recebida. Você receberá um e-mail com seus dados em até 15 dias." 
      : "Sua solicitação de exclusão de dados foi recebida e será processada conforme os prazos legais da LGPD."
  });
});

app.get("/api/health", async (req, res) => {
  const status: any = {
    status: "ok",
    supabase: !!supabase,
    env: {
      url: !!process.env.SUPABASE_URL,
      key: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
    }
  };

  if (supabase) {
    try {
      const { count, error } = await supabase.from("tenants").select("*", { count: 'exact', head: true });
      status.db_connection = !error;
      status.tenants_count = count;
      if (error) status.db_error = error;

      // Check for app_users table
      const { data: usersTable, error: usersTableError } = await supabase.from("app_users").select("id").limit(1);
      status.app_users_table = !usersTableError;
      if (usersTableError) status.app_users_error = usersTableError;
    } catch (err: any) {
      status.db_connection = false;
      status.db_error = err.message;
    }
  }

  res.json(status);
});

app.post("/api/login", async (req, res) => {
  let { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e senha são obrigatórios" });
  }

  email = email.trim().toLowerCase();
  password = password.trim();

  try {
    if (!supabase) {
      console.error("Login Error: Supabase client is null. Check environment variables.");
      return res.status(503).json({ 
        error: "Serviço indisponível", 
        details: "O cliente do banco de dados não foi inicializado corretamente no Vercel. Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." 
      });
    }

    console.log(`Attempting login for: ${email}`);
    
    // Auto-bootstrap if it's the super admin email and login fails
    const superAdminEmails = ["felipemenezes9272@gmail.com"];
    
    // Debug: Check if user exists at all
    let { data: userExists, error: existError } = await supabase
      .from("app_users")
      .select("id, email, password, is_super_admin, tenant_id, email_confirmed")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (!userExists && superAdminEmails.includes(email)) {
      console.log(`Super admin ${email} not found. Triggering automatic bootstrap...`);
      const bootstrapResult = await bootstrapAdmin();
      
      if (!bootstrapResult.success) {
        console.error("Bootstrap failed during login:", bootstrapResult.error);
      }

      // Retry fetch
      const { data: retriedUser, error: retryError } = await supabase
        .from("app_users")
        .select("id, email, password, is_super_admin, tenant_id, email_confirmed")
        .eq("email", email)
        .limit(1)
        .maybeSingle();
      
      if (retriedUser) {
        userExists = retriedUser;
        console.log(`Successfully bootstrapped and found user ${email} on retry.`);
      } else {
        console.error("Retry fetch failed after bootstrap. Error:", retryError);
        // If bootstrap failed or retry failed, we might want to know why
        if (bootstrapResult.results) {
          const myResult = bootstrapResult.results.find((r: any) => r.email === email);
          if (myResult && myResult.error) {
            return res.status(401).json({ 
              error: "Usuário não encontrado e falha ao criar administrador", 
              details: myResult.error.message || myResult.error 
            });
          }
        }
      }
    }

    if (existError) {
      console.error("Debug User Check Error:", existError);
      return res.status(500).json({ error: "Erro na consulta ao banco de dados", details: existError.message });
    }

    if (!userExists) {
      console.warn(`Login Failed: User ${email} not found in database.`);
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    // Direct comparison for now (plain text)
    if (userExists.password !== password) {
      if (superAdminEmails.includes(email)) {
        console.log(`Incorrect password for super admin ${email}. Resetting to default...`);
        await bootstrapAdmin();
        
        // Check again after bootstrap
        const { data: resetUser } = await supabase
          .from("app_users")
          .select("id, email, password, is_super_admin, tenant_id, email_confirmed")
          .eq("email", email)
          .limit(1)
          .maybeSingle();
          
        if (resetUser && resetUser.password === password) {
          console.log(`Login successful for super admin ${email} after password reset.`);
          return res.json(resetUser);
        }
      }
      console.warn(`Login Failed: Incorrect password for ${email}.`);
      return res.status(401).json({ error: "Senha incorreta" });
    }

    const user = userExists;

      if (user) {
        if (!user.email_confirmed && !user.is_super_admin) {
          return res.status(401).json({ error: "E-mail não confirmado. Por favor, verifique sua caixa de entrada." });
        }

        // Check tenant status if not super admin
        if (user.tenant_id && !user.is_super_admin) {
          const { data: tenant } = await supabase.from('tenants').select('status, license_end_date').eq('id', user.tenant_id).single();
          if (tenant) {
            const isExpired = tenant.license_end_date && new Date(tenant.license_end_date) < new Date();
            if (tenant.status === 'suspended' || isExpired) {
              return res.status(403).json({ 
                error: "Acesso suspenso", 
                details: isExpired ? "Sua licença expirou. Por favor, entre em contato com o administrador." : "Sua conta foi suspensa."
              });
            }
          }
        }
        
        // Log access
        try {
          const userAgent = req.headers['user-agent'] || 'Unknown';
          const ip = req.ip || req.headers['x-forwarded-for'] || 'Unknown';
          
          await supabase.from('access_logs').insert([{
            user_id: user.id,
            user_agent: userAgent,
            ip_address: String(ip),
            created_at: new Date().toISOString()
          }]);
        } catch (logErr) {
          console.error("Failed to log access:", logErr);
          // Don't fail login if logging fails
        }

        console.log(`Login successful for user: ${email} (ID: ${user.id})`);
        res.json(user);
      } else {
      console.warn(`Login failed for user: ${email}`);
      res.status(401).json({ error: "E-mail ou senha inválidos" });
    }
  } catch (err: any) {
    console.error("Login Route Error:", err.message || err);
    res.status(500).json({ 
      error: "Erro interno no servidor", 
      details: err.message || "Erro desconhecido"
    });
  }
});

// Password Recovery
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const { data: user } = await supabase.from("app_users").select("id").eq("email", email).maybeSingle();
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ success: true, message: "Se o e-mail estiver cadastrado, você receberá um link de recuperação." });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1);

    await supabase.from("app_users").update({
      reset_token: token,
      reset_token_expiry: expiry.toISOString()
    }).eq("id", user.id);

    console.log(`Password reset requested for ${email}. Token: ${token}`);
    
    // Send email
    try {
      await sendPasswordResetEmail(email, token);
    } catch (err) {
      console.error("Failed to send password reset email", err);
    }
    
    res.json({ success: true, message: "E-mail de recuperação enviado com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao processar recuperação de senha" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const { data: user } = await supabase.from("app_users")
      .select("id")
      .eq("reset_token", token)
      .gt("reset_token_expiry", new Date().toISOString())
      .maybeSingle();

    if (!user) {
      return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    await supabase.from("app_users").update({
      password: newPassword,
      reset_token: null,
      reset_token_expiry: null
    }).eq("id", user.id);

    // Send password changed notification
    try {
      const { data: userData } = await supabase.from("app_users").select("name, email").eq("id", user.id).single();
      if (userData) {
        await sendPasswordChangedEmail(userData.email, userData.name);
      }
    } catch (err) {
      console.error("Failed to send password changed email", err);
    }

    res.json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao redefinir senha" });
  }
});

app.post("/api/auth/change-password", async (req, res) => {
  const userIdHeader = req.headers['x-user-id'];
  const userId = userIdHeader ? Number(userIdHeader) : null;
  const { currentPassword, newPassword } = req.body;

  if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });

  try {
    const { data: user, error: fetchError } = await supabase
      .from("app_users")
      .select("password")
      .eq("id", userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    if (user.password !== currentPassword) {
      return res.status(400).json({ error: "Senha atual incorreta" });
    }

    const { error: updateError } = await supabase
      .from("app_users")
      .update({ password: newPassword })
      .eq("id", userId);

    if (updateError) {
      return res.status(500).json({ error: "Erro ao atualizar senha" });
    }

    // Send password changed notification
    try {
      const { data: userData } = await supabase.from("app_users").select("name, email").eq("id", userId).single();
      if (userData) {
        await sendPasswordChangedEmail(userData.email, userData.name);
      }
    } catch (err) {
      console.error("Failed to send password changed email", err);
    }

    res.json({ success: true, message: "Senha alterada com sucesso!" });
  } catch (err: any) {
    res.status(500).json({ error: "Erro interno ao alterar senha" });
  }
});

app.get("/api/auth/access-logs", async (req, res) => {
  const userIdHeader = req.headers['x-user-id'];
  const userId = userIdHeader ? Number(userIdHeader) : null;

  if (!userId) return res.status(401).json({ error: "Usuário não autenticado" });

  try {
    const { data, error } = await supabase
      .from("access_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: "Erro ao buscar histórico de acesso" });
  }
});

app.get("/api/auth/confirm-email", async (req, res) => {
  const { email } = req.query;
  try {
    const { error } = await supabase.from("app_users").update({
      email_confirmed: true
    }).eq("email", email);

    if (error) throw error;

    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #d97706;">E-mail Confirmado!</h2>
          <p>Sua conta foi ativada com sucesso.</p>
          <a href="/" style="display: inline-block; background: #d97706; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ir para o Login</a>
        </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send("Erro ao confirmar e-mail");
  }
});

// Tenant Management
app.get("/api/tenants", async (req, res) => {
  if (!(req as any).is_super_admin) return res.status(403).json({ error: "Acesso negado" });
  
  // Try to get all columns first
  let { data, error } = await supabase.from("tenants").select("*").order("name");
  
  // If it fails with 400, try to get only basic columns
  if (error && error.code === 'PGRST204') { // Column not found or similar
    const { data: basicData, error: basicError } = await supabase.from("tenants").select("id, name, slug, created_at").order("name");
    if (basicError) return res.status(400).json({ error: basicError.message });
    data = basicData;
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }

  // If we have data, try to enrich it with license info from settings for each tenant
  if (data && data.length > 0) {
    const tenantIds = data.map((t: any) => t.id);
    const { data: allSettings } = await supabase.from('settings')
      .select('tenant_id, key, value')
      .in('tenant_id', tenantIds)
      .in('key', ['status', 'license_type', 'license_start_date', 'license_end_date']);
    
    const settingsByTenant = (allSettings || []).reduce((acc: any, curr: any) => {
      if (!acc[curr.tenant_id]) acc[curr.tenant_id] = {};
      acc[curr.tenant_id][curr.key] = curr.value;
      return acc;
    }, {});

    const enrichedData = data.map((tenant: any) => {
      const tenantSettings = settingsByTenant[tenant.id] || {};
      return {
        ...tenant,
        status: tenant.status || tenantSettings.status || 'active',
        license_type: tenant.license_type || tenantSettings.license_type,
        license_start_date: tenant.license_start_date || tenantSettings.license_start_date,
        license_end_date: tenant.license_end_date || tenantSettings.license_end_date
      };
    });
    return res.json(enrichedData);
  }

  res.json(data || []);
});

app.post("/api/tenants", async (req, res) => {
  if (!(req as any).is_super_admin) return res.status(403).json({ error: "Acesso negado" });
  const { name, slug, admin_email, admin_password, admin_name, license_type } = req.body;
  
  // Calculate license end date
  let license_end_date = new Date();
  if (license_type === 'monthly') license_end_date.setMonth(license_end_date.getMonth() + 1);
  else if (license_type === 'quarterly') license_end_date.setMonth(license_end_date.getMonth() + 3);
  else if (license_type === 'semiannual') license_end_date.setMonth(license_end_date.getMonth() + 6);
  else if (license_type === 'annual') license_end_date.setFullYear(license_end_date.getFullYear() + 1);
  else license_end_date.setMonth(license_end_date.getMonth() + 1); // Default to monthly

  const license_start_date = new Date().toISOString();
  const license_end_date_str = license_end_date.toISOString();

  // Try to insert with all columns first
  let { data: tenant, error: tErr } = await supabase.from("tenants").insert([{ 
    name, 
    slug, 
    status: 'active',
    license_type,
    license_start_date,
    license_end_date: license_end_date_str
  }]).select().maybeSingle();
  
  // If it fails with 400, try to insert only basic columns and then update settings
  if (tErr && tErr.code === 'PGRST204') {
    const { data: basicTenant, error: basicError } = await supabase.from("tenants").insert([{ 
      name, 
      slug 
    }]).select().maybeSingle();
    
    if (basicError) return res.status(400).json({ error: basicError.message });
    tenant = basicTenant;

    // Store license info in settings table as fallback
    const licenseSettings = [
      { tenant_id: tenant.id, key: 'status', value: 'active' },
      { tenant_id: tenant.id, key: 'license_type', value: license_type },
      { tenant_id: tenant.id, key: 'license_start_date', value: license_start_date },
      { tenant_id: tenant.id, key: 'license_end_date', value: license_end_date_str }
    ];
    await supabase.from('settings').insert(licenseSettings);
  } else if (tErr) {
    return res.status(400).json({ error: tErr.message });
  }

  if (!tenant) return res.status(400).json({ error: "Erro ao criar loja" });

  const { error: uErr } = await supabase.from("app_users").insert([{
    tenant_id: tenant.id, email: admin_email, password: admin_password, name: admin_name, role: 'admin', email_confirmed: true
  }]);
  if (uErr) return res.status(400).json({ error: uErr.message });
  res.json({ success: true, tenantId: tenant.id });
});

app.patch("/api/tenants/:id", async (req, res) => {
  if (!(req as any).is_super_admin) return res.status(403).json({ error: "Acesso negado" });
  const { name, slug, status, license_type, license_end_date } = req.body;
  
  // Try to update all columns first
  const { error } = await supabase.from("tenants").update({ 
    name, 
    slug, 
    status, 
    license_type, 
    license_end_date 
  }).eq("id", req.params.id);
  
  // If it fails with 400, try to update only basic columns and then update settings
  if (error && error.code === 'PGRST204') {
    const { error: basicError } = await supabase.from("tenants").update({ 
      name, 
      slug 
    }).eq("id", req.params.id);
    
    if (basicError) return res.status(400).json({ error: basicError.message });

    // Update license info in settings table as fallback
    const licenseUpdates = [
      { key: 'status', value: status },
      { key: 'license_type', value: license_type },
      { key: 'license_end_date', value: license_end_date }
    ].filter(u => u.value !== undefined);

    for (const update of licenseUpdates) {
      const { data: existing } = await supabase.from('settings')
        .select('id')
        .eq('tenant_id', req.params.id)
        .eq('key', update.key)
        .is('user_id', null)
        .maybeSingle();
      
      if (existing) {
        await supabase.from('settings').update({ value: update.value }).eq('id', existing.id);
      } else {
        await supabase.from('settings').insert([{ tenant_id: req.params.id, key: update.key, value: update.value }]);
      }
    }
  } else if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ success: true });
});

app.delete("/api/tenants/:id", async (req, res) => {
  if (!(req as any).is_super_admin) return res.status(403).json({ error: "Acesso negado" });
  const { error } = await supabase.from("tenants").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// User Management
app.get("/api/admin/users", async (req, res) => {
  if (!(req as any).is_super_admin) {
    console.warn(`Access Denied: User is not a super admin for ${req.path}`);
    return res.status(403).json({ error: "Acesso negado" });
  }
  const { data, error } = await supabase.from("app_users").select("*, tenants:tenant_id (name)").order("name");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/admin/users", async (req, res) => {
  if (!(req as any).is_super_admin) return res.status(403).json({ error: "Acesso negado" });
  const { name, email, password, role, tenant_id, is_super_admin } = req.body;
  const emailStr = String(email || '').trim().toLowerCase();
  const actualIsSuperAdmin = emailStr === "felipemenezes9272@gmail.com" ? Boolean(is_super_admin) : false;
  const { data, error } = await supabase.from("app_users").insert([{
    name,
    email,
    password,
    role,
    tenant_id: tenant_id ? Number(tenant_id) : null,
    is_super_admin: actualIsSuperAdmin,
    email_confirmed: false // New users must confirm email
  }]).select().single();
  
  if (error) {
    console.error("Error creating user:", error);
    return res.status(400).json({ error: error.message });
  }

  // Send confirmation email
  try {
    await sendConfirmationEmail(email, name);
    console.log(`Confirmation email sent to ${email}`);
  } catch (err) {
    console.error("Failed to send confirmation email", err);
  }

  res.json(data);
});

app.put("/api/admin/users/:id", async (req, res) => {
  if (!(req as any).is_super_admin) return res.status(403).json({ error: "Acesso negado" });
  const { name, email, password, role, tenant_id, is_super_admin, email_confirmed } = req.body;
  const emailStr = String(email || '').trim().toLowerCase();
  const actualIsSuperAdmin = emailStr === "felipemenezes9272@gmail.com" ? Boolean(is_super_admin) : false;
  const updateData: any = { 
    name, 
    email, 
    role, 
    tenant_id: tenant_id ? Number(tenant_id) : null, 
    is_super_admin: actualIsSuperAdmin,
    email_confirmed: Boolean(email_confirmed)
  };
  if (password) updateData.password = password;
  const { error } = await supabase.from("app_users").update(updateData).eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/admin/users/:id", async (req, res) => {
  if (!(req as any).is_super_admin) return res.status(403).json({ error: "Acesso negado" });
  const { error } = await supabase.from("app_users").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Dashboard Stats
app.get("/api/dashboard/stats", async (req, res) => {
  const tenant_id = getTenantId(req);
  if (!tenant_id && !isSuperAdmin(req)) return res.json({});

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // 1. Today's Revenue
    let salesQuery = supabase.from("sales").select("total_amount").gte("created_at", todayISO);
    if (tenant_id) salesQuery = salesQuery.eq("tenant_id", tenant_id);
    const { data: todaySales } = await salesQuery;
    const todayRevenue = todaySales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;

    // 2. Pending Bills
    let billsQuery = supabase.from("accounts_payable").select("amount").eq("status", "Pendente");
    if (tenant_id) billsQuery = billsQuery.eq("tenant_id", tenant_id);
    const { data: pendingBills } = await billsQuery;
    const totalPendingBills = pendingBills?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;

    // 3. Low Stock Count
    let productsQuery = supabase.from("products").select("id, stock_quantity, min_stock_level");
    if (tenant_id) productsQuery = productsQuery.eq("tenant_id", tenant_id);
    const { data: products } = await productsQuery;
    const lowStockCount = products?.filter((p: any) => p.stock_quantity <= p.min_stock_level).length || 0;

    // 4. Sales Trend (Dynamic days)
    const requestedDays = parseInt(req.query.days as string) || 7;
    const periodDays = Math.min(Math.max(requestedDays, 7), 30);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (periodDays - 1));
    startDate.setHours(0, 0, 0, 0);

    let trendQuery = supabase.from("sales")
      .select("id, total_amount, created_at, sale_items(quantity, unit_price, discount, products(cost_price))")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });
    
    if (tenant_id) trendQuery = trendQuery.eq("tenant_id", tenant_id);
    
    const { data: allSales } = await trendQuery;

    const salesTrend = Array.from({ length: periodDays }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toLocaleDateString('pt-BR');
      
      const daySalesData = allSales?.filter(s => new Date(s.created_at).toLocaleDateString('pt-BR') === dateStr) || [];
      
      const daySales = daySalesData.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const dayProfit = daySalesData.reduce((sum, s) => {
        const saleProfit = s.sale_items?.reduce((pSum: number, item: any) => {
          const revenue = (Number(item.unit_price) - Number(item.discount)) * Number(item.quantity);
          const cost = Number(item.products?.cost_price || 0) * Number(item.quantity);
          return pSum + (revenue - cost);
        }, 0) || 0;
        return sum + saleProfit;
      }, 0);

      return {
        name: periodDays <= 7 
          ? date.toLocaleDateString('pt-BR', { weekday: 'short' })
          : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }),
        sales: daySales,
        profit: dayProfit
      };
    });

    // 5. Top Products (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let topProductsQuery = supabase.from("sale_items")
      .select("product_id, quantity, products(name), sales!inner(created_at)")
      .gte("sales.created_at", thirtyDaysAgo.toISOString());
    
    if (tenant_id) topProductsQuery = topProductsQuery.eq("tenant_id", tenant_id);
    
    const { data: saleItems } = await topProductsQuery;
    
    const productSales: { [key: number]: { name: string, total_sold: number } } = {};
    saleItems?.forEach((item: any) => {
      const id = item.product_id;
      if (!id) return;
      if (!productSales[id]) {
        productSales[id] = { name: item.products?.name || "Produto Desconhecido", total_sold: 0 };
      }
      productSales[id].total_sold += Number(item.quantity);
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 5);

    // 6. Expiry Alerts (Next 30 days)
    const next30Days = new Date();
    next30Days.setDate(next30Days.getDate() + 30);
    
    let expiryQuery = supabase.from("batches")
      .select("id")
      .lte("expiry_date", next30Days.toISOString())
      .gte("expiry_date", new Date().toISOString());
    
    if (tenant_id) expiryQuery = expiryQuery.eq("tenant_id", tenant_id);
    const { count: expiryAlertsCount } = await expiryQuery;

    // 7. Today's Profit
    let profitQuery = supabase.from("sale_items")
      .select("quantity, unit_price, discount, products(cost_price), sales!inner(created_at)")
      .gte("sales.created_at", todayISO);
    
    if (tenant_id) profitQuery = profitQuery.eq("tenant_id", tenant_id);
    
    const { data: todayItems } = await profitQuery;
    const todayProfit = todayItems?.reduce((sum, item: any) => {
      const revenue = (Number(item.unit_price) - Number(item.discount)) * Number(item.quantity);
      const cost = Number(item.products?.cost_price || 0) * Number(item.quantity);
      return sum + (revenue - cost);
    }, 0) || 0;

    res.json({
      todayRevenue,
      todayProfit,
      totalPendingBills,
      lowStockCount,
      expiryAlertsCount: expiryAlertsCount || 0,
      salesTrend,
      topProducts
    });
  } catch (err: any) {
    console.error("Dashboard Stats Error:", err);
    res.status(500).json({ error: "Erro ao carregar estatísticas" });
  }
});

// Cash Flow
app.get("/api/cash-flow/current", async (req, res) => {
  const tenant_id = getTenantId(req);
  if (!tenant_id) return res.json(null);
  const { data } = await supabase.from("cash_flow").select("*").eq("tenant_id", tenant_id).eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle();
  res.json(data || null);
});

app.post("/api/cash-flow/open", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { user_id, initial_value } = req.body;
  const { data, error } = await supabase.from("cash_flow").insert([{ tenant_id, user_id, initial_value, status: "open" }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data.id });
});

app.post("/api/cash-flow/close", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { id, final_value } = req.body;
  const { data: session } = await supabase.from("cash_flow").select("*").eq("id", id).eq("tenant_id", tenant_id).single();
  if (!session) return res.status(404).json({ error: "Sessão não encontrada" });
  const { data: sales } = await supabase.from("sales").select("total_amount").eq("tenant_id", tenant_id).gte("created_at", session.opened_at);
  const salesTotal = sales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const expected = Number(session.initial_value) + salesTotal;
  const { error } = await supabase.from("cash_flow").update({ closed_at: new Date().toISOString(), final_value, expected_value: expected, status: "closed" }).eq("id", id).eq("tenant_id", tenant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Admin Settings
app.post("/api/admin/settings", async (req, res) => {
  if (!isSuperAdmin(req)) return res.status(403).json({ error: "Acesso negado" });
  
  const settings = req.body;
  try {
    for (const [key, value] of Object.entries(settings)) {
      // Store global settings (tenant_id = null, user_id = null)
      const { data: existing } = await supabase.from("settings")
        .select("id")
        .is("tenant_id", null)
        .is("user_id", null)
        .eq("key", key)
        .maybeSingle();
      
      if (existing) {
        await supabase.from("settings")
          .update({ value: String(value) })
          .eq("id", existing.id);
      } else {
        await supabase.from("settings")
          .insert([{
            tenant_id: null,
            user_id: null,
            key,
            value: String(value)
          }]);
      }
    }
    res.json({ success: true, message: "Configurações globais atualizadas com sucesso!" });
  } catch (err: any) {
    console.error("Admin Settings Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Settings
app.get("/api/settings", async (req, res) => {
  const tenant_id = getTenantId(req);
  const userIdHeader = req.headers['x-user-id'];
  const userId = userIdHeader ? Number(userIdHeader) : null;
  
  try {
    // 1. Get global settings (system defaults)
    const { data: globalSettings } = await supabase.from("settings")
      .select("*")
      .is("tenant_id", null)
      .is("user_id", null);
    
    // 2. Get tenant settings
    const { data: tenantSettings } = tenant_id 
      ? await supabase.from("settings").select("*").eq("tenant_id", tenant_id).is("user_id", null)
      : { data: [] };
    
    // 3. Get user specific settings (preferences)
    const { data: userSettings } = userId 
      ? await supabase.from("settings").select("*").eq("user_id", userId)
      : { data: [] };
    
    // Merge order: Global < Tenant < User
    const settingsObj = [
      ...(globalSettings || []),
      ...(tenantSettings || []),
      ...(userSettings || [])
    ].reduce((acc: any, curr: any) => { 
      acc[curr.key] = curr.value; 
      return acc; 
    }, {});
    
    res.json(settingsObj);
  } catch (err) {
    console.error("Settings Fetch Error:", err);
    res.json({});
  }
});

app.post("/api/settings", async (req, res) => {
  const tenant_id = getTenantId(req);
  const userIdHeader = req.headers['x-user-id'];
  const userId = userIdHeader ? Number(userIdHeader) : null;
  const settings = req.body;
  
  try {
    for (const [key, value] of Object.entries(settings)) {
      const userSpecificKeys = [
        'theme', 'primary_color', 'sidebar_collapsed', 'font_size', 'interface_density',
        'pos_auto_focus', 'pos_auto_finalize', 'pos_auto_drawer', 'pos_confirm_cancel',
        'pos_default_payment', 'pos_auto_print', 'pos_show_change', 'pos_fast_mode',
        'pos_shortcuts_enabled', 'dashboard_config', 'view_mode'
      ];
      const isUserSpecific = userSpecificKeys.includes(key);
      
      const query = supabase.from("settings")
        .select("id")
        .eq("tenant_id", tenant_id)
        .eq("key", key);
      
      if (isUserSpecific && userId) {
        query.eq("user_id", userId);
      } else {
        query.is("user_id", null);
      }
      
      const { data: existing } = await query.maybeSingle();
      
      if (existing) {
        await supabase.from("settings")
          .update({ value: String(value) })
          .eq("id", existing.id);
      } else {
        await supabase.from("settings")
          .insert([{
            tenant_id,
            user_id: isUserSpecific ? userId : null,
            key,
            value: String(value)
          }]);
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Settings Update Error:", err);
    res.status(400).json({ error: err.message });
  }
});

// Products
app.get("/api/products", async (req, res) => {
  const tenant_id = getTenantId(req);
  let query = supabase.from("products").select("*, suppliers(name)");
  
  if (tenant_id) {
    query = query.eq("tenant_id", tenant_id);
  } else if (!isSuperAdmin(req)) {
    return res.json([]);
  }
  
  const { data, error } = await query.order("name").limit(5000);
  if (error) return res.status(400).json({ error: error.message });
  const products = data?.map((p: any) => ({ ...p, supplier_name: p.suppliers?.name })) || [];
  res.json(products);
});

app.post("/api/products", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { name, barcode, category, price, cost_price, stock_quantity, min_stock_level, supplier_id, image_url } = req.body;
  
  const productData = {
    tenant_id,
    name,
    barcode,
    category,
    price: Number(price),
    cost_price: cost_price ? Number(cost_price) : null,
    stock_quantity: Number(stock_quantity || 0),
    min_stock_level: Number(min_stock_level || 0),
    supplier_id: supplier_id ? Number(supplier_id) : null,
    image_url
  };

  const { data, error } = await supabase.from("products").insert([productData]).select().single();
  if (error) {
    console.error("Error creating product:", error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ id: data.id });
});

app.put("/api/products/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { name, barcode, category, price, cost_price, stock_quantity, min_stock_level, supplier_id, image_url } = req.body;
  
  const productData = {
    name,
    barcode,
    category,
    price: Number(price),
    cost_price: cost_price ? Number(cost_price) : null,
    stock_quantity: Number(stock_quantity || 0),
    min_stock_level: Number(min_stock_level || 0),
    supplier_id: supplier_id ? Number(supplier_id) : null,
    image_url
  };

  const { error } = await supabase.from("products").update(productData).eq("id", req.params.id).eq("tenant_id", tenant_id);
  if (error) {
    console.error("Error updating product:", error);
    return res.status(400).json({ error: error.message });
  }
  res.json({ success: true });
});

app.delete("/api/products/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { error } = await supabase.from("products").delete().eq("id", req.params.id).eq("tenant_id", tenant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Batches
app.get("/api/batches", async (req, res) => {
  const tenant_id = getTenantId(req);
  let query = supabase.from("batches").select("*, products(name)");
  
  if (tenant_id) {
    query = query.eq("tenant_id", tenant_id);
  } else if (!isSuperAdmin(req)) {
    return res.json([]);
  }
  
  const { data, error } = await query.order("expiry_date", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  const batches = data?.map((b: any) => ({ ...b, product_name: b.products?.name })) || [];
  res.json(batches);
});

app.post("/api/batches", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { product_id, quantity, expiry_date } = req.body;
  
  try {
    const { data: batch, error: batchErr } = await supabase.from("batches").insert([{ 
      tenant_id, 
      product_id: Number(product_id), 
      quantity: Number(quantity), 
      expiry_date 
    }]).select().single();
    
    if (batchErr) throw batchErr;
    
    // Update product stock
    const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", product_id).eq("tenant_id", tenant_id).single();
    const newStock = (product?.stock_quantity || 0) + Number(quantity);
    await supabase.from("products").update({ stock_quantity: newStock }).eq("id", product_id).eq("tenant_id", tenant_id);
    
    res.json({ id: batch.id });
  } catch (err: any) {
    console.error("Error creating batch:", err);
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/batches/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  try {
    const { data: batch, error: batchErr } = await supabase
      .from("batches")
      .select("*")
      .eq("id", req.params.id)
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (batchErr) throw batchErr;

    if (batch) {
      const { data: product, error: prodErr } = await supabase
        .from("products")
        .select("stock_quantity")
        .eq("id", batch.product_id)
        .eq("tenant_id", tenant_id)
        .maybeSingle();

      if (prodErr) throw prodErr;

      if (product) {
        const newStock = Math.max(0, (product.stock_quantity || 0) - Number(batch.quantity));
        await supabase
          .from("products")
          .update({ stock_quantity: newStock })
          .eq("id", batch.product_id)
          .eq("tenant_id", tenant_id);
      }

      const { error: delErr } = await supabase
        .from("batches")
        .delete()
        .eq("id", req.params.id)
        .eq("tenant_id", tenant_id);

      if (delErr) throw delErr;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting batch:", err);
    res.status(400).json({ error: err.message });
  }
});

// Suppliers
app.get("/api/suppliers", async (req, res) => {
  const tenant_id = getTenantId(req);
  let query = supabase.from("suppliers").select("*");
  
  if (tenant_id) {
    query = query.eq("tenant_id", tenant_id);
  } else if (!isSuperAdmin(req)) {
    return res.json([]);
  }
  
  const { data, error } = await query.order("name").limit(5000);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/suppliers", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { name, cnpj, contact, phone, email } = req.body;
  const { data, error } = await supabase.from("suppliers").insert([{ tenant_id, name, cnpj, contact, phone, email }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data.id });
});

app.put("/api/suppliers/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { name, cnpj, contact, phone, email } = req.body;
  const { error } = await supabase.from("suppliers").update({ name, cnpj, contact, phone, email }).eq("id", req.params.id).eq("tenant_id", tenant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/suppliers/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { error } = await supabase.from("suppliers").delete().eq("id", req.params.id).eq("tenant_id", tenant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Accounts Payable
app.get("/api/accounts-payable", async (req, res) => {
  const tenant_id = getTenantId(req);
  let query = supabase.from("accounts_payable").select("*, suppliers(name)");
  
  if (tenant_id) {
    query = query.eq("tenant_id", tenant_id);
  } else if (!isSuperAdmin(req)) {
    return res.json([]);
  }
  
  const { data, error } = await query.order("due_date", { ascending: true });
  if (error) return res.status(400).json({ error: error.message });
  const bills = data?.map((b: any) => ({ ...b, supplier_name: b.suppliers?.name })) || [];
  res.json(bills);
});

app.post("/api/accounts-payable", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { description, amount, due_date, category, supplier_id, is_recurring } = req.body;
  const { data, error } = await supabase.from("accounts_payable").insert([{ 
    tenant_id, 
    description, 
    amount: Number(amount), 
    due_date, 
    category, 
    supplier_id: supplier_id ? Number(supplier_id) : null, 
    is_recurring: !!is_recurring 
  }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data.id });
});

app.patch("/api/accounts-payable/:id/pay", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { data: bill } = await supabase.from("accounts_payable").select("*").eq("id", req.params.id).eq("tenant_id", tenant_id).single();
  if (!bill) return res.status(404).json({ error: "Conta não encontrada" });
  await supabase.from("accounts_payable").update({ status: "Pago" }).eq("id", req.params.id).eq("tenant_id", tenant_id);
  if (bill.is_recurring) {
    const dueDate = new Date(bill.due_date);
    dueDate.setMonth(dueDate.getMonth() + 1);
    await supabase.from("accounts_payable").insert([{ tenant_id, description: bill.description, amount: bill.amount, due_date: dueDate.toISOString().split('T')[0], category: bill.category, supplier_id: bill.supplier_id, is_recurring: true }]);
  }
  res.json({ success: true });
});

app.delete("/api/accounts-payable/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  await supabase.from("accounts_payable").delete().eq("id", req.params.id).eq("tenant_id", tenant_id);
  res.json({ success: true });
});

// Customers
app.get("/api/customers", async (req, res) => {
  const tenant_id = getTenantId(req);
  let query = supabase.from("customers").select("*");
  
  if (tenant_id) {
    query = query.eq("tenant_id", tenant_id);
  } else if (!isSuperAdmin(req)) {
    return res.json([]);
  }
  
  const { data, error } = await query.order("name").limit(5000);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

app.post("/api/customers", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { name, email, phone, document } = req.body;
  const { data, error } = await supabase.from("customers").insert([{ tenant_id, name, email, phone, document }]).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ id: data.id });
});

app.put("/api/customers/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { name, email, phone, document } = req.body;
  const { error } = await supabase.from("customers").update({ name, email, phone, document }).eq("id", req.params.id).eq("tenant_id", tenant_id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/customers/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  await supabase.from("customers").delete().eq("id", req.params.id).eq("tenant_id", tenant_id);
  res.json({ success: true });
});

// Inventory Logs
app.get("/api/inventory-logs", async (req, res) => {
  const tenant_id = getTenantId(req);
  let query = supabase.from("inventory_logs").select("*, products(name), app_users(name)");
  
  if (tenant_id) {
    query = query.eq("tenant_id", tenant_id);
  } else if (!isSuperAdmin(req)) {
    return res.json([]);
  }
  
  const { data, error } = await query.order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(400).json({ error: error.message });
  const logs = data?.map((l: any) => ({ ...l, product_name: l.products?.name, user_name: l.app_users?.name })) || [];
  res.json(logs);
});

app.post("/api/inventory-logs", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { product_id, user_id, type, quantity, notes } = req.body;
  
  try {
    const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", product_id).eq("tenant_id", tenant_id).single();
    const currentStock = product?.stock_quantity || 0;
    const change = Number(quantity);
    const newStock = type === 'Entrada' ? currentStock + change : 
                     type === 'Saída' ? currentStock - change : 
                     change; // For 'Ajuste', we might treat quantity as the new absolute stock or the change. 
                             // Let's assume quantity is the CHANGE for Entrada/Saída and the NEW TOTAL for Ajuste if it's positive, 
                             // but to keep it simple and consistent with the UI, let's say quantity is always the CHANGE.
    
    const finalStock = type === 'Ajuste' ? change : (type === 'Entrada' ? currentStock + change : currentStock - change);

    let { data, error } = await supabase.from("inventory_logs").insert([{ 
      tenant_id, 
      product_id: Number(product_id), 
      user_id: user_id ? Number(user_id) : null, 
      type,
      quantity: change,
      resulting_stock: finalStock,
      notes 
    }]).select().single();

    // Fallback if notes column doesn't exist in inventory_logs table
    if (error && (error.code === '42703' || (error.message && (error.message.includes("column") && error.message.includes("notes"))))) {
      const { data: retryData, error: retryErr } = await supabase.from("inventory_logs").insert([{ 
        tenant_id, 
        product_id: Number(product_id), 
        user_id: user_id ? Number(user_id) : null, 
        type,
        quantity: change,
        resulting_stock: finalStock
      }]).select().single();
      data = retryData;
      error = retryErr;
    }

    if (error) throw error;

    await supabase.from("products").update({ stock_quantity: finalStock }).eq("id", product_id).eq("tenant_id", tenant_id);
    
    res.json({ id: data.id, resulting_stock: finalStock });
  } catch (err: any) {
    console.error("Inventory Log Error:", JSON.stringify(err, null, 2));
    res.status(400).json({ 
      error: err.message || "Erro ao processar log de estoque",
      details: err.details || err.hint || null,
      code: err.code || null
    });
  }
});

// Sales
app.get("/api/sales", async (req, res) => {
  const tenant_id = getTenantId(req);
  let query = supabase.from("sales").select("*, customers(name), sale_items(*, products(name, cost_price))");
  
  if (tenant_id) {
    query = query.eq("tenant_id", tenant_id);
  } else if (!isSuperAdmin(req)) {
    return res.json([]);
  }
  
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  const sales = data?.map((s: any) => {
    const totalCost = s.sale_items?.reduce((sum: number, item: any) => {
      const cost = Number(item.products?.cost_price || 0);
      return sum + (cost * Number(item.quantity || 0));
    }, 0) || 0;
    return { 
      ...s, 
      customer_name: s.customers?.name,
      total_cost: totalCost,
      profit: Number(s.total_amount) - totalCost,
      items: s.sale_items?.map((i: any) => ({ ...i, product_name: i.products?.name })) || []
    };
  }) || [];
  res.json(sales);
});

app.get("/api/sales/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { data: sale } = await supabase.from("sales").select("*, customers(name, phone)").eq("id", req.params.id).eq("tenant_id", tenant_id).single();
  if (!sale) return res.status(404).json({ error: "Venda não encontrada" });
  const { data: items } = await supabase.from("sale_items").select("*, products(name, cost_price)").eq("sale_id", req.params.id).eq("tenant_id", tenant_id);
  const formattedItems = items?.map((i: any) => ({ 
    ...i, 
    product_name: i.products?.name,
    cost_price: i.cost_price || i.products?.cost_price || 0
  })) || [];
  res.json({ ...sale, customer_name: (sale as any).customers?.name, customer_phone: (sale as any).customers?.phone, items: formattedItems });
});

app.post("/api/sales", validateFields(['items', 'total_amount', 'payment_method']), async (req, res) => {
  const tenant_id = getTenantId(req);
  const { customer_id, items, total_amount, discount, payment_method, payments, notes, change_amount, operator_name } = req.body;
  
  if (!tenant_id) {
    console.error("Sale Creation Error: Missing tenant_id");
    return res.status(401).json({ error: "Tenant ID não encontrado. Por favor, faça login novamente." });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "O carrinho não pode estar vazio" });
  }

  try {
    // Use payments if provided, otherwise fallback to payment_method
    const finalPaymentMethod = (payments ? JSON.stringify(payments) : payment_method) || "Dinheiro";

    const totalAmountNum = Number(total_amount);
    const discountNum = Number(discount || 0);

    if (isNaN(totalAmountNum)) {
      return res.status(400).json({ error: "Valor total inválido" });
    }

    const saleInsertData: any = { 
      tenant_id, 
      customer_id: (customer_id && !isNaN(Number(customer_id))) ? Number(customer_id) : null, 
      total_amount: totalAmountNum, 
      discount: discountNum, 
      payment_method: finalPaymentMethod,
      notes: notes || null,
      change_amount: Number(change_amount || 0),
      operator_name: operator_name || null
    };

    let { data: sale, error: saleErr } = await supabase.from("sales").insert([saleInsertData]).select().single();
    
    // Fallback if columns don't exist in sales table
    if (saleErr && (saleErr.code === '42703' || (saleErr.message && saleErr.message.includes("column")))) {
      console.log("Fallback: Some columns missing in 'sales' table. Retrying with minimal fields.");
      const { data: retrySale, error: retryErr } = await supabase.from("sales").insert([{ 
        tenant_id, 
        customer_id: (customer_id && !isNaN(Number(customer_id))) ? Number(customer_id) : null, 
        total_amount: totalAmountNum, 
        discount: discountNum, 
        payment_method: finalPaymentMethod
      }]).select().single();
      sale = retrySale;
      saleErr = retryErr;
    }
    
    if (saleErr) {
      console.error("Error creating sale (DB Error):", saleErr);
      const errorMessage = saleErr.message || (typeof saleErr === 'object' ? JSON.stringify(saleErr) : String(saleErr));
      return res.status(500).json({ 
        error: `Erro ao criar venda: ${errorMessage}`,
        details: saleErr.details || saleErr.hint || null,
        code: saleErr.code || null
      });
    }

    if (!sale || !sale.id) {
      console.error("Error creating sale: Sale object is null after insertion");
      return res.status(500).json({ error: "Erro ao criar venda: O objeto da venda não foi retornado pelo banco de dados." });
    }
    
    // Process items and update stock
    const itemPromises = items.map(async (item: any) => {
      const productId = Number(item.product_id || item.id);
      const qty = Number(item.quantity);
      
      if (isNaN(productId) || isNaN(qty) || qty <= 0) {
        console.warn(`Invalid item in sale: product_id=${productId}, quantity=${qty}`);
        return;
      }
      
      // 2. Update product stock and get cost price
      const { data: product, error: prodErr } = await supabase.from("products").select("stock_quantity, cost_price").eq("id", productId).eq("tenant_id", tenant_id).single();
      
      if (prodErr || !product) {
        console.warn(`Product ${productId} not found for tenant ${tenant_id}:`, prodErr);
        return;
      }

      const costPrice = product.cost_price || 0;
      
      // 1. Insert sale item
      let { error: itemErr } = await supabase.from("sale_items").insert([{ 
        tenant_id, 
        sale_id: sale.id, 
        product_id: productId, 
        quantity: qty, 
        unit_price: Number(item.unit_price || item.price || 0), 
        discount: Number(item.discount || 0),
        cost_price: costPrice,
        notes: item.notes || null
      }]);
      
      // Fallback if notes or cost_price column doesn't exist
      if (itemErr && (itemErr.code === '42703' || (itemErr.message && itemErr.message.includes("column")))) {
        const fallbackData: any = { 
          tenant_id, 
          sale_id: sale.id, 
          product_id: productId, 
          quantity: qty, 
          unit_price: Number(item.unit_price || item.price || 0), 
          discount: Number(item.discount || 0)
        };
        const { error: retryErr } = await supabase.from("sale_items").insert([fallbackData]);
        itemErr = retryErr;
      }
      
      if (itemErr) {
        console.error(`Error inserting sale item for product ${productId}:`, JSON.stringify(itemErr, null, 2));
        throw itemErr;
      }

      const newStock = (product?.stock_quantity || 0) - qty;
      await supabase.from("products").update({ stock_quantity: newStock }).eq("id", productId).eq("tenant_id", tenant_id);

      // Create inventory log
      const userIdHeader = req.headers['x-user-id'];
      const userId = userIdHeader ? Number(userIdHeader) : null;
      const validUserId = (userId && !isNaN(userId)) ? userId : null;

      let { error: logErr } = await supabase.from("inventory_logs").insert([{
        tenant_id,
        product_id: productId,
        user_id: validUserId,
        type: 'Saída',
        quantity: qty,
        resulting_stock: newStock,
        notes: `Venda #${sale.id}`
      }]);

      // Fallback for inventory_logs if notes doesn't exist
      if (logErr && (logErr.code === '42703' || (logErr.message && (logErr.message.includes("column") && logErr.message.includes("notes"))))) {
        console.log("Fallback: 'notes' column missing in 'inventory_logs' table. Retrying without it.");
        const { error: retryErr } = await supabase.from("inventory_logs").insert([{
          tenant_id,
          product_id: productId,
          user_id: validUserId,
          type: 'Saída',
          quantity: qty,
          resulting_stock: newStock
        }]);
        logErr = retryErr;
      }

      if (logErr) {
        console.error(`Error creating inventory log for product ${productId}:`, JSON.stringify(logErr, null, 2));
      }
    });

    await Promise.all(itemPromises);
    
    // Update customer points
    if (customer_id) {
      const { data: customer } = await supabase.from("customers").select("points").eq("id", customer_id).eq("tenant_id", tenant_id).single();
      const newPoints = (customer?.points || 0) + Math.floor(Number(total_amount) / 10);
      await supabase.from("customers").update({ points: newPoints }).eq("id", customer_id).eq("tenant_id", tenant_id);
    }
    
    res.json({ success: true, saleId: sale.id });
  } catch (err: any) {
    console.error("Sale Creation Error:", err);
    res.status(400).json({ 
      error: err.message || "Erro ao processar venda",
      details: err.details || err.hint || null,
      code: err.code || null
    });
  }
});

app.put("/api/sales/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { customer_id, items, total_amount, discount, payment_method, payments, notes, change_amount, operator_name } = req.body;
  const saleId = req.params.id;

  try {
    // 1. Get old items to revert stock
    const { data: oldItems } = await supabase.from("sale_items").select("*").eq("sale_id", saleId).eq("tenant_id", tenant_id);
    
    if (oldItems) {
      for (const item of oldItems) {
        const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", item.product_id).eq("tenant_id", tenant_id).single();
        const revertedStock = (product?.stock_quantity || 0) + Number(item.quantity);
        await supabase.from("products").update({ stock_quantity: revertedStock }).eq("id", item.product_id).eq("tenant_id", tenant_id);

        // Create inventory log for revert
        let { error: logErr } = await supabase.from("inventory_logs").insert([{
          tenant_id,
          product_id: item.product_id,
          user_id: req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : null,
          type: 'Entrada',
          quantity: Number(item.quantity),
          resulting_stock: revertedStock,
          notes: `Estorno de Venda #${saleId}`
        }]);

        // Fallback for inventory_logs if notes doesn't exist
        if (logErr && (logErr.code === '42703' || (logErr.message && (logErr.message.includes("column") && logErr.message.includes("notes"))))) {
          const { error: retryErr } = await supabase.from("inventory_logs").insert([{
            tenant_id,
            product_id: item.product_id,
            user_id: req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : null,
            type: 'Entrada',
            quantity: Number(item.quantity),
            resulting_stock: revertedStock
          }]);
          logErr = retryErr;
        }

        if (logErr) {
          console.error(`Error creating inventory log for revert of product ${item.product_id}:`, JSON.stringify(logErr, null, 2));
        }
      }
    }

    // 2. Delete old items
    await supabase.from("sale_items").delete().eq("sale_id", saleId).eq("tenant_id", tenant_id);

    // 3. Update sale record
    const finalPaymentMethod = (payments ? JSON.stringify(payments) : payment_method) || "Dinheiro";
    const totalAmountNum = Number(total_amount);
    const discountNum = Number(discount || 0);

    if (isNaN(totalAmountNum)) {
      return res.status(400).json({ error: "Valor total inválido" });
    }

    const saleUpdateData: any = {
      customer_id: (customer_id && !isNaN(Number(customer_id))) ? Number(customer_id) : null,
      total_amount: totalAmountNum,
      discount: discountNum,
      payment_method: finalPaymentMethod,
      notes: notes || null,
      change_amount: Number(change_amount || 0),
      operator_name: operator_name || null
    };

    let { error: saleErr } = await supabase.from("sales").update(saleUpdateData).eq("id", Number(saleId)).eq("tenant_id", tenant_id);

    // Fallback if columns don't exist in sales table
    if (saleErr && (saleErr.code === '42703' || (saleErr.message && saleErr.message.includes("column")))) {
      console.log("Fallback: Some columns missing in 'sales' table during update. Retrying with minimal fields.");
      const { error: retryErr } = await supabase.from("sales").update({
        customer_id: (customer_id && !isNaN(Number(customer_id))) ? Number(customer_id) : null,
        total_amount: totalAmountNum,
        discount: discountNum,
        payment_method: finalPaymentMethod
      }).eq("id", Number(saleId)).eq("tenant_id", tenant_id);
      saleErr = retryErr;
    }

    if (saleErr) {
      console.error(`Error updating sale ${saleId} (DB Error):`, saleErr);
      const errorMessage = saleErr.message || (typeof saleErr === 'object' ? JSON.stringify(saleErr) : String(saleErr));
      return res.status(500).json({ 
        error: `Erro ao atualizar venda: ${errorMessage}`,
        details: saleErr.details || saleErr.hint || null,
        code: saleErr.code || null
      });
    }

    // 4. Insert new items and update stock
    if (items && Array.isArray(items)) {
      for (const item of items) {
        const productId = Number(item.product_id || item.id);
        const qty = Number(item.quantity);
        const price = Number(item.unit_price || item.price || 0);
        const disc = Number(item.discount || 0);

        if (isNaN(productId) || isNaN(qty) || qty <= 0) {
          console.warn(`Invalid item in sale update: product_id=${productId}, quantity=${qty}`);
          continue;
        }

        // Fetch current cost price for the product
        const { data: prodData, error: prodErr } = await supabase.from("products").select("stock_quantity, cost_price").eq("id", productId).eq("tenant_id", tenant_id).single();
        
        if (prodErr || !prodData) {
          console.warn(`Product ${productId} not found for tenant ${tenant_id} during update:`, prodErr);
          continue;
        }

        const costPrice = prodData.cost_price || 0;

        let { error: itemErr } = await supabase.from("sale_items").insert([{ 
          tenant_id, 
          sale_id: Number(saleId), 
          product_id: productId, 
          quantity: qty, 
          unit_price: price, 
          discount: disc,
          cost_price: costPrice,
          notes: item.notes || null
        }]);

        // Fallback if notes or cost_price column doesn't exist
        if (itemErr && (itemErr.code === '42703' || (itemErr.message && itemErr.message.includes("column")))) {
          const { error: retryErr } = await supabase.from("sale_items").insert([{ 
            tenant_id, 
            sale_id: Number(saleId), 
            product_id: productId, 
            quantity: qty, 
            unit_price: price, 
            discount: disc 
          }]);
          itemErr = retryErr;
        }

        if (itemErr) {
          console.error(`Error inserting sale item for product ${productId} in update:`, JSON.stringify(itemErr, null, 2));
          // We continue but log it
        }

        const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", productId).eq("tenant_id", tenant_id).single();
        const newStock = (product?.stock_quantity || 0) - qty;
        await supabase.from("products").update({ stock_quantity: newStock }).eq("id", productId).eq("tenant_id", tenant_id);

        // Create inventory log for new item
        const userIdHeader = req.headers['x-user-id'];
        const userId = userIdHeader ? Number(userIdHeader) : null;
        const validUserId = (userId && !isNaN(userId)) ? userId : null;

        let { error: logErr } = await supabase.from("inventory_logs").insert([{
          tenant_id,
          product_id: productId,
          user_id: validUserId,
          type: 'Saída',
          quantity: qty,
          resulting_stock: newStock,
          notes: `Venda #${saleId} (Editada)`
        }]);

        // Fallback for inventory_logs if notes doesn't exist
        if (logErr && (logErr.code === '42703' || (logErr.message && (logErr.message.includes("column") && logErr.message.includes("notes"))))) {
          await supabase.from("inventory_logs").insert([{
            tenant_id,
            product_id: productId,
            user_id: validUserId,
            type: 'Saída',
            quantity: qty,
            resulting_stock: newStock
          }]);
        }
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error("Error updating sale:", JSON.stringify(err, null, 2));
    res.status(400).json({ 
      error: err.message || "Erro ao atualizar venda",
      details: err.details || err.hint || null,
      code: err.code || null
    });
  }
});

app.delete("/api/sales/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { data: sale } = await supabase.from("sales").select("*").eq("id", req.params.id).eq("tenant_id", tenant_id).single();
  if (!sale) return res.status(404).json({ error: "Venda não encontrada" });
  const { data: items } = await supabase.from("sale_items").select("*").eq("sale_id", req.params.id).eq("tenant_id", tenant_id);
  for (const item of items || []) {
    const { data: product } = await supabase.from("products").select("stock_quantity").eq("id", item.product_id).eq("tenant_id", tenant_id).single();
    const newStock = (product?.stock_quantity || 0) + Number(item.quantity);
    await supabase.from("products").update({ stock_quantity: newStock }).eq("id", item.product_id).eq("tenant_id", tenant_id);

    // Create inventory log for deletion
    let { error: logErr } = await supabase.from("inventory_logs").insert([{
      tenant_id,
      product_id: item.product_id,
      user_id: req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : null,
      type: 'Entrada',
      quantity: Number(item.quantity),
      resulting_stock: newStock,
      notes: `Venda #${req.params.id} Excluída`
    }]);

    // Fallback for inventory_logs if notes doesn't exist
    if (logErr && (logErr.code === '42703' || (logErr.message && (logErr.message.includes("column") && logErr.message.includes("notes"))))) {
      const { error: retryErr } = await supabase.from("inventory_logs").insert([{
        tenant_id,
        product_id: item.product_id,
        user_id: req.headers['x-user-id'] ? Number(req.headers['x-user-id']) : null,
        type: 'Entrada',
        quantity: Number(item.quantity),
        resulting_stock: newStock
      }]);
      logErr = retryErr;
    }

    if (logErr) {
      console.error(`Error creating inventory log for deletion of product ${item.product_id}:`, JSON.stringify(logErr, null, 2));
    }
  }
  if (sale.customer_id) {
    const { data: customer } = await supabase.from("customers").select("points").eq("id", sale.customer_id).eq("tenant_id", tenant_id).single();
    const newPoints = Math.max(0, (customer?.points || 0) - Math.floor(sale.total_amount / 10));
    await supabase.from("customers").update({ points: newPoints }).eq("id", sale.customer_id).eq("tenant_id", tenant_id);
  }
  await supabase.from("sale_items").delete().eq("sale_id", req.params.id).eq("tenant_id", tenant_id);
  await supabase.from("sales").delete().eq("id", req.params.id).eq("tenant_id", tenant_id);
  res.json({ success: true });
});

// Stats
app.get("/api/stats", async (req, res) => {
  const tenant_id = getTenantId(req);
  try {
    let salesQuery = supabase.from("sales").select("total_amount, created_at, sale_items(quantity, products(cost_price))");
    let productsQuery = supabase.from("products").select("*");
    let saleItemsQuery = supabase.from("sale_items").select("quantity, products(name)");

    if (tenant_id) {
      salesQuery = salesQuery.eq("tenant_id", tenant_id);
      productsQuery = productsQuery.eq("tenant_id", tenant_id);
      saleItemsQuery = saleItemsQuery.eq("tenant_id", tenant_id);
    } else if (!isSuperAdmin(req)) {
      return res.json({ totalRevenue: 0, todayRevenue: 0, totalProfit: 0, todayProfit: 0, lowStockCount: 0, topProducts: [] });
    }

    const { data: allSales } = await salesQuery;
    
    const calculateProfit = (sale: any) => {
      const totalCost = sale.sale_items?.reduce((sum: number, item: any) => {
        const cost = Number(item.products?.cost_price || 0);
        return sum + (cost * Number(item.quantity || 0));
      }, 0) || 0;
      return Number(sale.total_amount) - totalCost;
    };

    const totalRevenue = allSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const totalProfit = allSales?.reduce((sum, s) => sum + calculateProfit(s), 0) || 0;
    
    const today = new Date().toISOString().split('T')[0];
    const todaySales = allSales?.filter(s => s.created_at.startsWith(today)) || [];
    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
    const todayProfit = todaySales.reduce((sum, s) => sum + calculateProfit(s), 0) || 0;
    
    const { data: products } = await productsQuery;
    const lowStockCount = products?.filter(p => p.stock_quantity <= p.min_stock_level).length || 0;
    
    const { data: saleItems } = await saleItemsQuery;
    const productSales: any = {};
    saleItems?.forEach((item: any) => {
      const name = item.products?.name;
      if (name) productSales[name] = (productSales[name] || 0) + item.quantity;
    });
    const topProducts = Object.entries(productSales).map(([name, total_sold]) => ({ name, total_sold })).sort((a: any, b: any) => b.total_sold - a.total_sold).slice(0, 5);
    res.json({ totalRevenue, todayRevenue, totalProfit, todayProfit, lowStockCount, topProducts });
  } catch (err: any) {
    console.error("Stats Error:", err);
    res.status(500).json({ error: "Erro ao carregar estatísticas" });
  }
});

// Calendar Events
app.get("/api/calendar/events", async (req, res) => {
  const tenant_id = getTenantId(req);
  if (!tenant_id && !isSuperAdmin(req)) return res.json([]);

  try {
    let query = supabase.from("calendar_events").select("*");
    if (tenant_id) query = query.eq("tenant_id", tenant_id);
    
    const { data, error } = await query.order("start_time", { ascending: true });
    if (error) throw error;
    
    const mapped = (data || []).map((e: any) => {
      let ext: any = {};
      if (e.description && e.description.trim().startsWith("{")) {
        try {
          ext = JSON.parse(e.description);
        } catch (parseErr) {
          ext = { description: e.description };
        }
      } else {
        ext = { description: e.description || "" };
      }

      return {
        id: e.id,
        tenant_id: e.tenant_id,
        title: e.title,
        start_at: e.start_time || e.start_at,
        end_at: e.end_time || e.end_at,
        type: ext.type || "Tarefa",
        status: ext.status || "Pendente",
        priority: ext.priority || "Média",
        customer: ext.customer || "",
        location: ext.location || "",
        description: ext.description || "",
        responsible_id: ext.responsible_id || null,
        value: ext.value || 0,
        color: ext.color || "",
        tags: ext.tags || []
      };
    });

    res.json(mapped);
  } catch (err: any) {
    console.error("Calendar Get Events Error:", err);
    res.status(500).json({ error: "Erro ao carregar eventos do calendário" });
  }
});

app.post("/api/calendar/events", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { title, description, start_at, end_at, type, status, priority, customer, location, responsible_id, value, color, tags } = req.body;
  
  try {
    const bundledDescription = JSON.stringify({
      description: description || "",
      type: type || "Tarefa",
      status: status || "Pendente",
      priority: priority || "Média",
      customer: customer || "",
      location: location || "",
      responsible_id: responsible_id || null,
      value: Number(value || 0),
      color: color || "",
      tags: tags || []
    });

    const { data, error } = await supabase.from("calendar_events").insert([{
      tenant_id,
      title: title || "",
      description: bundledDescription,
      start_time: start_at || new Date().toISOString(),
      end_time: end_at || null
    }]).select().single();

    if (error) throw error;

    const resEvent = {
      id: data.id,
      tenant_id: data.tenant_id,
      title: data.title,
      start_at: data.start_time,
      end_at: data.end_time,
      type: type || "Tarefa",
      status: status || "Pendente",
      priority: priority || "Média",
      customer: customer || "",
      location: location || "",
      description: description || "",
      responsible_id: responsible_id || null,
      value: Number(value || 0),
      color: color || "",
      tags: tags || []
    };

    res.json(resEvent);
  } catch (err: any) {
    console.error("Calendar Create Event Error:", err);
    res.status(400).json({ error: err.message || "Erro ao criar evento" });
  }
});

app.put("/api/calendar/events/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  const { title, description, start_at, end_at, type, status, priority, customer, location, responsible_id, value, color, tags } = req.body;
  
  try {
    const bundledDescription = JSON.stringify({
      description: description || "",
      type: type || "Tarefa",
      status: status || "Pendente",
      priority: priority || "Média",
      customer: customer || "",
      location: location || "",
      responsible_id: responsible_id || null,
      value: Number(value || 0),
      color: color || "",
      tags: tags || []
    });

    const { data, error } = await supabase.from("calendar_events")
      .update({
        title: title || "",
        description: bundledDescription,
        start_time: start_at || new Date().toISOString(),
        end_time: end_at || null
      })
      .eq("id", req.params.id)
      .eq("tenant_id", tenant_id)
      .select()
      .single();

    if (error) throw error;

    const resEvent = {
      id: data.id,
      tenant_id: data.tenant_id,
      title: data.title,
      start_at: data.start_time,
      end_at: data.end_time,
      type: type || "Tarefa",
      status: status || "Pendente",
      priority: priority || "Média",
      customer: customer || "",
      location: location || "",
      description: description || "",
      responsible_id: responsible_id || null,
      value: Number(value || 0),
      color: color || "",
      tags: tags || []
    };

    res.json(resEvent);
  } catch (err: any) {
    console.error("Calendar Update Event Error:", err);
    res.status(400).json({ error: err.message || "Erro ao atualizar evento" });
  }
});

app.delete("/api/calendar/events/:id", async (req, res) => {
  const tenant_id = getTenantId(req);
  try {
    const { error } = await supabase.from("calendar_events")
      .delete()
      .eq("id", req.params.id)
      .eq("tenant_id", tenant_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error("Calendar Delete Event Error:", err);
    res.status(400).json({ error: err.message || "Erro ao excluir evento" });
  }
});

export default app;
