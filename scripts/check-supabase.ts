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

  try {
    const response = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key },
    });

    if (!response.ok && response.status !== 404) {
      console.error(`[ERROR] Respuesta HTTP inesperada: ${response.status}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[ERROR] No se pudo alcanzar Supabase: ${(err as Error).message}`);
    process.exit(1);
  }

  console.log(`[OK] Conectado a Supabase (${url})`);
  process.exit(0);
}

main();
