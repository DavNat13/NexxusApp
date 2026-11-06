import postgres from 'postgres'
import { env, superuserUrl } from '../src/env.js'

interface RoleSpec {
  name: string
  url: string
  searchPath: string | null
}

const roles: RoleSpec[] = [
  { name: 'migrator', url: env.DATABASE_URL_MIGRATOR, searchPath: null },
  { name: 'auth_service', url: env.DATABASE_URL_AUTH, searchPath: 'auth' },
  { name: 'app_user', url: env.DATABASE_URL_APP, searchPath: 'public' },
]

function passwordOf(url: string): string {
  const parsed = new URL(url)
  if (!parsed.password) throw new Error(`La URL no lleva contraseña: ${parsed.host}`)
  return decodeURIComponent(parsed.password)
}

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

const sql = postgres(superuserUrl, { max: 1, onnotice: () => {} })

try {
  for (const role of roles) {
    await sql.unsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quote(role.name)}) THEN
          ALTER ROLE ${role.name} WITH LOGIN PASSWORD ${quote(passwordOf(role.url))};
        ELSE
          CREATE ROLE ${role.name} WITH LOGIN PASSWORD ${quote(passwordOf(role.url))};
        END IF;
      END
      $$;
    `)

    await sql.unsafe(
      `ALTER ROLE ${role.name} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`,
    )

    if (role.searchPath) {
      await sql.unsafe(`ALTER ROLE ${role.name} SET search_path = ${role.searchPath};`)
    }
  }

  const db = sql(env.POSTGRES_DB)

  await sql`REVOKE ALL ON DATABASE ${db} FROM PUBLIC`
  await sql`GRANT CONNECT ON DATABASE ${db} TO migrator, auth_service, app_user`
  await sql`GRANT CREATE ON DATABASE ${db} TO migrator`
  await sql`GRANT USAGE, CREATE ON SCHEMA public TO migrator`
  await sql`GRANT USAGE ON SCHEMA public TO app_user`

  const report = await sql<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
    SELECT rolname, rolsuper, rolbypassrls
    FROM pg_roles
    WHERE rolname IN ('migrator', 'auth_service', 'app_user')
    ORDER BY rolname
  `

  for (const row of report) {
    if (row.rolsuper || row.rolbypassrls) {
      throw new Error(`El rol ${row.rolname} tiene privilegios elevados`)
    }
  }

  console.log('Roles listos:')
  console.table(report)
} finally {
  await sql.end()
}
