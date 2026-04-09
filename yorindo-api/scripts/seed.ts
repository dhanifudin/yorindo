/**
 * Database Seed Script (Phase 2)
 *
 * Inserts realistic dev data for local development.
 * Guards against running in production.
 *
 * Usage:
 *   npx tsx scripts/seed.ts          # basic seed (10 contacts, 3 events)
 *   npx tsx scripts/seed.ts --demo   # comprehensive demo seed (500 contacts, 10 events)
 *
 * Requires: DATABASE_URL environment variable, NODE_ENV != production
 */

import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import { createId } from '@paralleldrive/cuid2'
import { seedDemo } from './seed-demo'

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

const isDemo = process.argv.includes('--demo')

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
    await client.query(`
      INSERT INTO events (id, name, slug, date, city, venue, capacity, status, is_paid, registration_closed) VALUES
        ($1, 'Workshop Teknologi 2026', 'workshop-teknologi-2026', NOW() + INTERVAL '30 days', 'Jakarta', 'Gedung A', 100, 'draft', FALSE, FALSE),
        ($2, 'Konferensi Kesehatan', 'konferensi-kesehatan', NOW() + INTERVAL '60 days', 'Bandung', 'Balai Kota', 200, 'published', FALSE, FALSE),
        ($3, 'Seminar Inovasi 2025', 'seminar-inovasi-2025', NOW() - INTERVAL '30 days', 'Surabaya', 'Hotel Grand', 150, 'completed', FALSE, TRUE)
      ON CONFLICT (slug) DO NOTHING
    `, [createId(), createId(), createId()])
    console.log('✓ Seeded events (draft, published, completed)')

    // Contacts — valid status values: provisional | pending | approved | rejected
    const cities = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Yogyakarta']
    const sizes = ['<50', '50-200', '200-1000', '>1000']
    const industrySlugs = ['teknologi', 'kesehatan']
    const jobSlugs = ['software-engineer', 'product-manager']
    const industryNames = ['Elektronik & Peralatan Rumah Tangga', 'Farmasi & Alat Kesehatan']

    for (let i = 1; i <= 10; i++) {
      const city = cities[i % cities.length]
      const size = sizes[i % sizes.length]
      const location = cityLocationMap[city]
      const industryId = industryMap[industrySlugs[i % 2]]
      const jobTitleId = jobTitleMap[jobSlugs[i % 2]]
      const serviceType = industryNames[i % 2]

      await client.query(`
        INSERT INTO contacts (
          id, name, phone, email, city, company, company_size, source, consent_status,
          industry_id, job_title_id, service_type,
          province_code, province_name, city_code, city_name
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'manual', 'active', $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (phone) DO NOTHING
      `, [
        createId(),
        `Contact ${i}`,
        `+6281200000${String(i).padStart(3, '0')}`,
        i <= 8 ? `contact${i}@example.com` : null, // contacts 9-10 missing email
        city,
        `PT Perusahaan ${i}`,
        size,
        industryId ?? null,
        jobTitleId ?? null,
        serviceType,
        location?.province_code ?? null,
        location?.province_name ?? null,
        location?.city_code ?? null,
        location?.city_name ?? null,
      ])
    }
    console.log('✓ Seeded 10 contacts (8 complete, 2 missing email)')

    // Duplicate contact pairs (3 pairs for dev testing)
    const devDupPairs = [
      { nameA: 'Budi Santoso', phoneA: '+628120000101', emailA: 'budi@company.co.id', nameB: 'Budi Santoso', phoneB: '+628120000102', emailB: 'budi.santoso@gmail.com', score: 0.95 },
      { nameA: 'Sari Dewi Kusuma', phoneA: '+628120000103', emailA: 'sari.kusuma@work.id', nameB: 'Sari Dewi', phoneB: '+628120000104', emailB: 'saridewi@gmail.com', score: 0.82 },
      { nameA: 'Ahmad Hidayat', phoneA: '+628120000105', emailA: 'ahmad.h@office.id', nameB: 'Ahmad Hidayat S.', phoneB: '+628120000106', emailB: 'ahmadh@gmail.com', score: 0.78 },
    ]
    const location0 = cityLocationMap['Jakarta']
    const industryId0 = industryMap['teknologi']
    const jobTitleId0 = jobTitleMap['software-engineer']
    for (const pair of devDupPairs) {
      const primaryId = createId()
      const duplicateId = createId()
      await client.query(`
        INSERT INTO contacts (id, name, phone, email, city, company, company_size, source, consent_status, industry_id, job_title_id, service_type, province_code, province_name, city_code, city_name)
        VALUES ($1,$2,$3,$4,'Jakarta','PT Dev Corp','50-200','manual','active',$5,$6,'Elektronik & Peralatan Rumah Tangga',$7,$8,$9,$10)
        ON CONFLICT (phone) DO NOTHING
      `, [primaryId, pair.nameA, pair.phoneA, pair.emailA, industryId0, jobTitleId0,
          location0?.province_code, location0?.province_name, location0?.city_code, location0?.city_name])
      await client.query(`
        INSERT INTO contacts (id, name, phone, email, city, company, company_size, source, consent_status, industry_id, job_title_id, service_type, flag_category, province_code, province_name, city_code, city_name)
        VALUES ($1,$2,$3,$4,'Jakarta','PT Dev Corp','<50','form','active',$5,$6,'Elektronik & Peralatan Rumah Tangga','duplicate',$7,$8,$9,$10)
        ON CONFLICT (phone) DO NOTHING
      `, [duplicateId, pair.nameB, pair.phoneB, pair.emailB, industryId0, jobTitleId0,
          location0?.province_code, location0?.province_name, location0?.city_code, location0?.city_name])
      await client.query(`
        INSERT INTO duplicate_pairs (id, primary_id, duplicate_id, match_score, match_reasons)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (primary_id, duplicate_id) DO NOTHING
      `, [createId(), primaryId, duplicateId, pair.score, JSON.stringify(['name_similar'])])
    }
    console.log('✓ Seeded 3 duplicate contact pairs')

    // Templates (all 12: 6 types × 2 channels)
    await client.query(`
      INSERT INTO templates (id, name, type, channel, subject, body) VALUES
        ($1, 'Undangan Event (WhatsApp)', 'invitation', 'whatsapp', NULL, 'Halo {{name}}, Anda diundang ke {{event_title}} pada {{date}} di {{venue}}.'),
        ($2, 'Undangan Event (Email)', 'invitation', 'email', 'Undangan: {{event_title}}', '<p>Halo {{name}},</p><p>Anda diundang ke <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p>'),
        ($3, 'Konfirmasi Tiket (WhatsApp)', 'confirmation', 'whatsapp', NULL, 'Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.'),
        ($4, 'Konfirmasi Tiket (Email)', 'confirmation', 'email', 'Konfirmasi: {{event_title}}', '<p>Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.</p>'),
        ($5, 'Penolakan (WhatsApp)', 'rejection', 'whatsapp', NULL, 'Maaf {{name}}, registrasi Anda tidak dapat diterima.'),
        ($6, 'Penolakan (Email)', 'rejection', 'email', 'Status Registrasi', '<p>Maaf {{name}}, registrasi Anda tidak dapat diterima.</p>'),
        ($7, 'Pengiriman Tiket (WhatsApp)', 'ticket_delivery', 'whatsapp', NULL, 'Berikut tiket Anda untuk {{event_title}}. Token: {{token}}'),
        ($8, 'Pengiriman Tiket (Email)', 'ticket_delivery', 'email', 'Tiket Anda', '<p>Berikut tiket Anda untuk {{event_title}}.</p><p>Token: {{token}}</p>'),
        ($9, 'Pembatalan Event (WhatsApp)', 'cancellation', 'whatsapp', NULL, 'Maaf {{name}}, event {{event_title}} dibatalkan.'),
        ($10, 'Pembatalan Event (Email)', 'cancellation', 'email', 'Event Dibatalkan', '<p>Maaf {{name}}, event {{event_title}} telah dibatalkan.</p>'),
        ($11, 'Pengingat Event (WhatsApp)', 'reminder', 'whatsapp', NULL, 'Halo {{name}}, event {{event_title}} tinggal {{days}} hari lagi!'),
        ($12, 'Pengingat Event (Email)', 'reminder', 'email', 'Pengingat: {{event_title}}', '<p>Halo {{name}},</p><p>Event <strong>{{event_title}}</strong> tinggal {{days}} hari lagi.</p>')
      ON CONFLICT DO NOTHING
    `, [createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId()])
    console.log('✓ Seeded 12 templates (6 types × 2 channels)')

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

const run = isDemo ? () => seedDemo(pool).then(() => pool.end()) : seed

run().catch((err: unknown) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
