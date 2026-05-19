export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}
