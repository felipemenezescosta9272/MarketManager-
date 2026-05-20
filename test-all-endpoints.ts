import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Simple mock for express-like req/res to test the internal route handlers if we want, or we can just run queries directly.
// Alternatively, let's run the actual database queries for all these endpoints under the context of:
// tenant_id = null
// is_super_admin = true
// userId = 1

async function run() {
  let supabaseUrl = process.env.SUPABASE_URL;
  if (supabaseUrl) {
    supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, "");
  }
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing credentials");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const userId = 1;
  const tenant_id = null;
  const is_super_admin = true;

  const endpoints = [
    { name: "/api/products", query: () => supabase.from("products").select("*, suppliers(name)").order("name").limit(5000) },
    { name: "/api/customers", query: () => supabase.from("customers").select("*").order("name") },
    { name: "/api/suppliers", query: () => supabase.from("suppliers").select("*").order("name") },
    { name: "/api/sales", query: () => supabase.from("sales").select("*, customers(name), sale_items(*, products(name, cost_price))").order("id", { ascending: false }) },
    { name: "/api/accounts-payable", query: () => supabase.from("accounts_payable").select("*, suppliers(name)").order("due_date") },
    { name: "/api/cash-flow/current", query: () => supabase.from("cash_flow").select("*").is("tenant_id", null).eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle() },
    { name: "/api/settings", query: () => supabase.from("settings").select("*").is("tenant_id", null).is("user_id", null) },
    { name: "/api/inventory-logs", query: () => supabase.from("inventory_logs").select("*, products(name), app_users(name)").order("id", { ascending: false }) },
    { name: "/api/batches", query: () => supabase.from("batches").select("*, products(name)").order("expiry_date") },
    { name: "/api/tenants", query: () => supabase.from("tenants").select("*").order("name") },
    { name: "/api/admin/users", query: () => supabase.from("app_users").select("*, tenants:tenant_id (name)").order("name") },
  ];

  for (const ep of endpoints) {
    console.log(`Testing endpoint query equivalent for ${ep.name}...`);
    try {
      const { data, error } = await ep.query();
      if (error) {
        console.error(`❌ Query error for ${ep.name}:`, error);
      } else {
        console.log(`✅ Success for ${ep.name}: fetched ${Array.isArray(data) ? data.length : "one/null"} records`);
      }
    } catch (err: any) {
      console.error(`💥 Exception in query for ${ep.name}:`, err);
    }
  }

  // Test dashboard stats
  console.log("Testing dashboard stats query...");
  try {
    const todayISO = new Date().toISOString().split('T')[0] + "T00:00:00Z";
    let salesQuery = supabase.from("sales").select("total_amount");
    let billsQuery = supabase.from("accounts_payable").select("amount").eq("status", "Pendente");
    let productsQuery = supabase.from("products").select("id, stock_quantity, min_stock_level");
    let trendQuery = supabase.from("sales").select("total_amount, created_at").gte("created_at", todayISO);

    const { data: sales, error: sErr } = await salesQuery;
    const { data: bills, error: bErr } = await billsQuery;
    const { data: products, error: pErr } = await productsQuery;
    const { data: trend, error: tErr } = await trendQuery;

    if (sErr || bErr || pErr || tErr) {
      console.error("❌ Dashboard query error!", { sErr, bErr, pErr, tErr });
    } else {
      console.log("✅ Dashboard queries completed successfully.");
    }
  } catch (err: any) {
    console.error("💥 Dashboard stats queries failed:", err);
  }
}

run();
