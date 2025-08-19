// supabase.js — ESM puro para proyectos sin bundler (GitHub Pages friendly)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Config inyectada en runtime (ver config.js más abajo)
const CFG = (window.__APP_CONFIG__ ?? {});
const supabaseUrl = CFG.SUPABASE_URL;
const supabaseKey = CFG.SUPABASE_ANON_KEY;
const useMock    = Boolean(CFG.USE_MOCK);

// ---- Mock opcional de desarrollo (si USE_MOCK = true) ----
class MockSupabaseClient {
  from() {
    return {
      select: () => ({ data: [], error: null, count: 0 }),
      insert: (rows) => ({ data: rows, error: null }),
      update: (rows) => ({ data: rows, error: null }),
      delete: () => ({ data: null, error: null }),
      upsert: (rows) => ({ data: rows, error: null }),
      order: () => ({ data: [], error: null }),
      limit: () => ({ data: [], error: null }),
    };
  }
  rpc() { return { data: null, error: new Error("mock: no RPC") }; }
}

// ---- Cliente real o mock, según config ----
let supabase = null;

if (useMock) {
  console.warn("🧪 Supabase en modo MOCK (USE_MOCK=true).");
  supabase = new MockSupabaseClient();
} else if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Falta SUPABASE_URL o SUPABASE_ANON_KEY. Define window.__APP_CONFIG__.");
  // supabase queda en null; tu app puede caer a localStorage si quieres.
} else {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export { supabase };

// Pequeño sanity check
export async function testConnection() {
  if (!supabase) return false;
  try {
    // Cuenta filas sin traer datos
    const { error, count } = await supabase
      .from("activities")
      .select("*", { count: "exact", head: true });
    if (error) {
      console.error("Supabase error:", error);
      return false;
    }
    return typeof count === "number";
  } catch (e) {
    console.error("Connection test failed:", e);
    return false;
  }
}
