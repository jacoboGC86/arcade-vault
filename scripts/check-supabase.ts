import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error(
      "[ERROR] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno."
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);

  const { error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error(`[ERROR] ${sessionError.message}`);
    process.exit(1);
  }

  const { error: queryError } = await supabase
    .from("__check_supabase_connectivity__")
    .select("*")
    .limit(1);

  // PGRST205: table not found in schema cache -> confirms we reached PostgREST
  // with a valid API key (expected, since no schema exists yet).
  if (queryError && queryError.code !== "PGRST205") {
    console.error(`[ERROR] ${queryError.message}`);
    process.exit(1);
  }

  console.log(`[OK] Conectado a Supabase (${url})`);
  process.exit(0);
}

main();
