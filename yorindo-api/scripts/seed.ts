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

async function seed(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Industries
    await client.query(`
      INSERT INTO industries (slug, name) VALUES
        ('teknologi', 'Teknologi Informasi'),
        ('kesehatan', 'Kesehatan')
      ON CONFLICT (slug) DO NOTHING
    `)
    console.log('✓ Seeded industries')

    // Job Titles
    await client.query(`
      INSERT INTO job_titles (slug, name) VALUES
        ('software-engineer', 'Software Engineer'),
        ('product-manager', 'Product Manager')
      ON CONFLICT (slug) DO NOTHING
    `)
    console.log('✓ Seeded job_titles')

    // Users
    const adminHash = await bcrypt.hash('admin123', 10)
    const staffHash = await bcrypt.hash('staff123', 10)

    await client.query(`
      INSERT INTO users (email, password_hash, role, name) VALUES
        ('admin@yorindo.id', $1, 'event_admin', 'Admin Yorindo'),
        ('staff@yorindo.id', $2, 'staff', 'Staff Yorindo')
      ON CONFLICT (email) DO NOTHING
    `, [adminHash, staffHash])
    console.log('✓ Seeded users (admin + staff)')

    // Events
    const now = new Date()
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    await client.query(`
      INSERT INTO events (name, slug, date, city, venue, capacity, status) VALUES
        ('Workshop Teknologi 2026', 'workshop-teknologi-2026', $1, 'Jakarta', 'Gedung A', 100, 'draft'),
        ('Konferensi Kesehatan', 'konferensi-kesehatan', $2, 'Bandung', 'Balai Kota', 200, 'published'),
        ('Seminar Inovasi 2025', 'seminar-inovasi-2025', $3, 'Surabaya', 'Hotel Grand', 150, 'completed')
      ON CONFLICT (slug) DO NOTHING
    `, [futureDate, futureDate, pastDate])
    console.log('✓ Seeded events (draft, published, completed)')

    // Contacts
    const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta']
    const sizes = ['<50', '50-200', '200-1000', '>1000']

    for (let i = 1; i <= 10; i++) {
      const city = cities[i % cities.length]
      const size = sizes[i % sizes.length]
      await client.query(`
        INSERT INTO contacts (name, phone, email, city, company, company_size, source, consent_status)
        VALUES ($1, $2, $3, $4, $5, $6, 'manual', 'active')
        ON CONFLICT (phone) DO NOTHING
      `, [
        `Contact ${i}`,
        `+6281200000${String(i).padStart(3, '0')}`,
        `contact${i}@example.com`,
        city,
        `PT Perusahaan ${i}`,
        size,
      ])
    }
    console.log('✓ Seeded 10 contacts')

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
