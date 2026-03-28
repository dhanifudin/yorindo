/**
 * Database Seed Script (Phase 2)
 *
 * Inserts realistic dev data for local development.
 * Guards against running in production.
 *
 * Usage: npx tsx scripts/seed.ts
 * Requires: DATABASE_URL environment variable, NODE_ENV != production
 */

import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import { createId } from '@paralleldrive/cuid2'

if (process.env.NODE_ENV === 'production') {
  console.error('Seed script must not run in production.')
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

// wilayah.id city → location codes mapping (sample subset)
const cityLocationMap: Record<string, { province_code: string; province_name: string; city_code: string; city_name: string }> = {
  'Jakarta':    { province_code: '31', province_name: 'DKI Jakarta',      city_code: '31.71', city_name: 'Kota Jakarta Pusat' },
  'Bandung':    { province_code: '32', province_name: 'Jawa Barat',        city_code: '32.73', city_name: 'Kota Bandung' },
  'Surabaya':   { province_code: '35', province_name: 'Jawa Timur',        city_code: '35.78', city_name: 'Kota Surabaya' },
  'Medan':      { province_code: '12', province_name: 'Sumatera Utara',    city_code: '12.71', city_name: 'Kota Medan' },
  'Yogyakarta': { province_code: '34', province_name: 'DI Yogyakarta',     city_code: '34.71', city_name: 'Kota Yogyakarta' },
}

async function seed(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Industries
    const industryTekId = createId()
    const industryKesId = createId()
    await client.query(`
      INSERT INTO industries (id, slug, name) VALUES
        ($1, 'teknologi', 'Teknologi Informasi'),
        ($2, 'kesehatan', 'Kesehatan')
      ON CONFLICT (slug) DO NOTHING
    `, [industryTekId, industryKesId])
    console.log('✓ Seeded industries')

    // Fetch actual IDs (handles ON CONFLICT DO NOTHING case)
    const industryRows = await client.query(`SELECT id, slug FROM industries WHERE slug IN ('teknologi', 'kesehatan')`)
    const industryMap = Object.fromEntries(industryRows.rows.map((r: { id: string; slug: string }) => [r.slug, r.id]))

    // Job Titles
    await client.query(`
      INSERT INTO job_titles (id, slug, name) VALUES
        ($1, 'software-engineer', 'Software Engineer'),
        ($2, 'product-manager', 'Product Manager')
      ON CONFLICT (slug) DO NOTHING
    `, [createId(), createId()])
    console.log('✓ Seeded job_titles')

    // Fetch actual job title IDs
    const jobTitleRows = await client.query(`SELECT id, slug FROM job_titles WHERE slug IN ('software-engineer', 'product-manager')`)
    const jobTitleMap = Object.fromEntries(jobTitleRows.rows.map((r: { id: string; slug: string }) => [r.slug, r.id]))

    // Users
    const sharedHash = await bcrypt.hash('Password123!', 10)
    await client.query(`
      INSERT INTO users (id, email, password_hash, role, name) VALUES
        ($1, 'admin@yorindo.id', $4, 'admin', 'Admin Yorindo'),
        ($2, 'staff@yorindo.id', $4, 'staff', 'Staff Yorindo'),
        ($3, 'viewer@yorindo.id', $4, 'viewer', 'Viewer Yorindo')
      ON CONFLICT (email) DO NOTHING
    `, [createId(), createId(), createId(), sharedHash])
    console.log('✓ Seeded users (admin + staff + viewer)')

    // Events
    const now = new Date()
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    await client.query(`
      INSERT INTO events (id, name, slug, date, city, venue, capacity, status, is_paid, registration_closed) VALUES
        ($1, 'Workshop Teknologi 2026', 'workshop-teknologi-2026', $4, 'Jakarta', 'Gedung A', 100, 'draft', FALSE, FALSE),
        ($2, 'Konferensi Kesehatan', 'konferensi-kesehatan', $5, 'Bandung', 'Balai Kota', 200, 'published', FALSE, FALSE),
        ($3, 'Seminar Inovasi 2025', 'seminar-inovasi-2025', $6, 'Surabaya', 'Hotel Grand', 150, 'completed', FALSE, TRUE)
      ON CONFLICT (slug) DO NOTHING
    `, [createId(), createId(), createId(), futureDate, futureDate, pastDate])
    console.log('✓ Seeded events (draft, published, completed)')

    // Contacts — valid status values: provisional | pending | approved | rejected
    const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta']
    const sizes = ['<50', '50-200', '200-1000', '>1000']
    const industrySlugs = ['teknologi', 'kesehatan']
    const jobSlugs = ['software-engineer', 'product-manager']

    for (let i = 1; i <= 10; i++) {
      const city = cities[i % cities.length]
      const size = sizes[i % sizes.length]
      const location = cityLocationMap[city]
      const industryId = industryMap[industrySlugs[i % 2]]
      const jobTitleId = jobTitleMap[jobSlugs[i % 2]]

      await client.query(`
        INSERT INTO contacts (
          id, name, phone, email, city, company, company_size, source, consent_status,
          industry_id, job_title_id,
          province_code, province_name, city_code, city_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', 'active', $8, $9, $10, $11, $12, $13)
        ON CONFLICT (phone) DO NOTHING
      `, [
        createId(),
        `Contact ${i}`,
        `+6281200000${String(i).padStart(3, '0')}`,
        `contact${i}@example.com`,
        city,
        `PT Perusahaan ${i}`,
        size,
        industryId ?? null,
        jobTitleId ?? null,
        location?.province_code ?? null,
        location?.province_name ?? null,
        location?.city_code ?? null,
        location?.city_name ?? null,
      ])
    }
    console.log('✓ Seeded 10 contacts (with province/city codes)')

    await client.query('COMMIT')
    console.log('Seed complete.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed().catch((err: unknown) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
