// Resolves Supabase connection settings from every supported variable name.
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (set in Vercel) take priority so the
// browser bundle and server functions always talk to the same project.

const URL_KEYS = ['VITE_SUPABASE_URL', 'SUPABASE_URL'] as const;
const PUBLIC_KEY_KEYS = [
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
] as const;

// Vite statically inlines `import.meta.env.VITE_*` references, so each name must be read explicitly.
const buildTimeEnv: Record<string, string | undefined> = {
  VITE_SUPABASE_URL: import.meta.env['VITE_SUPABASE_URL'],
  VITE_SUPABASE_ANON_KEY: import.meta.env['VITE_SUPABASE_ANON_KEY'],
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
};

function readEnv(name: string): string | undefined {
  const fromBuild = buildTimeEnv[name];
  if (fromBuild) return fromBuild;
  if (typeof process !== 'undefined' && process.env) return process.env[name];
  return undefined;
}

function firstDefined(names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = readEnv(name)?.trim().replace(/^["']|["']$/g, '');
    if (value) return value;
  }
  return undefined;
}

// Mobile keyboards often auto-capitalize pasted values ("Https://", "Sb_publishable_"),
// which Supabase rejects with "Invalid API key".
export function normalizeSupabaseUrl(value: string): string {
  return value.replace(/^https?:\/\//i, (scheme) => scheme.toLowerCase()).replace(/\/+$/, '');
}

export function normalizeSupabaseKey(value: string): string {
  return value.replace(/^sb_(publishable|secret)_/i, (prefix) => prefix.toLowerCase());
}

export function getSupabaseConfig(): { url: string; key: string } {
  const url = firstDefined(URL_KEYS);
  const key = firstDefined(PUBLIC_KEY_KEYS);

  if (!url || !key) {
    const missing = [
      ...(!url ? ['VITE_SUPABASE_URL'] : []),
      ...(!key ? ['VITE_SUPABASE_ANON_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return { url: normalizeSupabaseUrl(url), key: normalizeSupabaseKey(key) };
}

export function getSupabaseServerUrl(): string | undefined {
  const url = firstDefined(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
  return url ? normalizeSupabaseUrl(url) : undefined;
}
