/**
 * Database Seed Script (Phase 2)
 *
 * Inserts realistic dev data for local development.
 * Guards against accidental production runs — override with ALLOW_SEED=true.
 *
 * Usage:
 *   npx tsx scripts/seed.ts          # basic seed (10 contacts, 3 events)
 *   npx tsx scripts/seed.ts --demo   # comprehensive demo seed (500 contacts, 10 events)
 *
 * Requires: DATABASE_URL or POSTGRES_* variables
 *   ALLOW_SEED=true — required when NODE_ENV=production
 */

import { Pool } from 'pg'
import { hashSync } from '@node-rs/bcrypt'
import { createId } from '@paralleldrive/cuid2'
import { seedDemo } from './seed-demo'
import { runMigrations } from './migrate'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Seed script blocked in production to prevent accidental data loss.')
  console.error('')
  console.error('To force-run the seed in production, set ALLOW_SEED=true:')
  console.error('  docker compose exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/seed.ts')
  console.error('  docker compose exec -T -e ALLOW_SEED=true api node_modules/.bin/tsx scripts/seed.ts --demo')
  console.error('')
  console.error('Or use make targets:')
  console.error('  make seed-demo          # seed without wiping')
  console.error('  make reset-demo-data    # wipe all data and re-seed')
  process.exit(1)
}

function buildDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const user = process.env.POSTGRES_USER ?? 'yorindo'
  const password = process.env.POSTGRES_PASSWORD ?? ''
  const host = process.env.POSTGRES_HOST ?? 'localhost'
  const port = process.env.POSTGRES_PORT ?? '5432'
  const db = process.env.POSTGRES_DB ?? 'yorindo'
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${db}`
}

const databaseUrl = buildDatabaseUrl()
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
    const sharedHash = hashSync('Password123!', 10)
    await client.query(`
      INSERT INTO users (id, email, password_hash, role, name) VALUES
        ($1, 'admin@yorindo.id', $4, 'admin', 'Admin EM · U'),
        ($2, 'staff@yorindo.id', $4, 'staff', 'Staff EM · U'),
        ($3, 'viewer@yorindo.id', $4, 'viewer', 'Viewer EM · U')
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
    const industryNames = ['Teknologi Informasi & Software', 'Farmasi & Alat Kesehatan']

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
        VALUES ($1,$2,$3,$4,'Jakarta','PT Dev Corp','50-200','manual','active',$5,$6,'Teknologi Informasi & Software',$7,$8,$9,$10)
      `, [primaryId, pair.nameA, pair.phoneA, pair.emailA, industryId0, jobTitleId0,
          location0?.province_code, location0?.province_name, location0?.city_code, location0?.city_name])
      await client.query(`
        INSERT INTO contacts (id, name, phone, email, city, company, company_size, source, consent_status, industry_id, job_title_id, service_type, flag_category, province_code, province_name, city_code, city_name)
        VALUES ($1,$2,$3,$4,'Jakarta','PT Dev Corp','<50','form','active',$5,$6,'Teknologi Informasi & Software','duplicate',$7,$8,$9,$10)
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
    // Professional HTML email templates with branded styling
    const WA_BASE = (msg: string) => msg
    const EMAIL_WRAP = (title: string, accent: string, bodyHtml: string, footer = true) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:linear-gradient(135deg,#184A9A 0%,#2563EB 100%);padding:28px 24px;text-align:center}.header h1{color:#fff;margin:0 0 6px;font-size:22px;font-weight:600}.header p{color:#dbeafe;margin:0;font-size:14px}.content{padding:28px 24px}.content p{color:#475569;font-size:15px;line-height:1.6}.cta{display:inline-block;background:#184A9A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin:16px 0}.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}.info-box .label{font-weight:600;color:#64748b;font-size:13px}.info-box .value{color:#1e293b;font-size:14px;margin-top:2px}.footer{background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0}.footer p{color:#64748b;font-size:13px;margin:4px 0}</style></head><body>
<div class="container">
  <div class="header"><h1>${title}</h1><p>${accent}</p></div>
  <div class="content">${bodyHtml}</div>
  ${footer ? '<div class="footer"><p style="font-weight:600;color:#184A9A;margin-bottom:6px">EM · U Event Management</p><p>Email ini dikirim secara otomatis, mohon tidak membalas.</p><p>&copy; 2026 EM · U. Hak cipta dilindungi.</p></div>' : ''}
</div></body></html>`

    await client.query(`
      INSERT INTO templates (id, name, type, channel, subject, body, logo_url, image_type, bg_opacity) VALUES
        ($1, 'Undangan Event (WhatsApp)', 'invitation', 'whatsapp', NULL,
         'Halo *{{name}}*,\n\nAnda diundang ke *{{event_title}}*\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nSegera daftar melalui:\n{{registration_link}}\n\n_Kami menantikan kehadiran Anda._', NULL, NULL, NULL),
        ($2, 'Undangan Event (Email)', 'invitation', 'email',
         'Undangan: {{event_title}}',
         '${EMAIL_WRAP("📨 Undangan Event", "Anda mendapat undangan baru",
         `<p>Halo <strong>{{name}}</strong>,</p><p>Anda diundang untuk menghadiri event <strong>{{event_title}}</strong>.</p><div class="info-box"><div class="label">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><p style="text-align:center"><a href="{{registration_link}}" class="cta">Daftar Sekarang</a></p><p style="font-size:13px;color:#64748b">Klik tombol di atas untuk mendaftar. Kami menantikan kehadiran Anda.</p>`)}', NULL, NULL, NULL),
        ($3, 'Konfirmasi Registrasi (WhatsApp)', 'confirmation', 'whatsapp', NULL,
         'Selamat *{{name}}*! 🎉\n\nRegistrasi Anda untuk *{{event_title}}* telah *disetujui*.\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nTiket akan dikirim ke email Anda. Periksa inbox Anda.', NULL, NULL, NULL),
        ($4, 'Konfirmasi Registrasi (Email)', 'confirmation', 'email',
         'Konfirmasi: {{event_title}}',
         '${EMAIL_WRAP("✅ Registrasi Dikonfirmasi", "Registrasi Anda telah disetujui",
         `<p>Halo <strong>{{name}}</strong>,</p><p>Selamat! Registrasi Anda untuk <strong>{{event_title}}</strong> telah <span style="color:#16a34a;font-weight:600">disetujui</span>.</p><div class="info-box"><div class="label">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><p>Tiket akan dikirimkan ke email ini. Silakan periksa inbox Anda secara berkala.</p><p style="font-size:13px;color:#64748b">Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>`)}', NULL, NULL, NULL),
        ($5, 'Penolakan Registrasi (WhatsApp)', 'rejection', 'whatsapp', NULL,
         'Halo {{name}},\n\nMohon maaf, registrasi Anda untuk *{{event_title}}* *tidak dapat kami terima*.\n\nHal ini mungkin dikarenakan kuota yang terbatas atau ketidaksesuaian kriteria.\n\n_Terima kasih atas minat Anda._', NULL, NULL, NULL),
        ($6, 'Penolakan Registrasi (Email)', 'rejection', 'email',
         'Status Registrasi: {{event_title}}',
         '${EMAIL_WRAP("📋 Status Registrasi", "Terima kasih atas minat Anda",
         `<p>Halo <strong>{{name}}</strong>,</p><p>Terima kasih telah mendaftar untuk <strong>{{event_title}}</strong>.</p><p style="color:#dc2626;font-weight:500">Mohon maaf, registrasi Anda <strong>tidak dapat kami terima</strong> pada kesempatan ini.</p><p>Hal ini mungkin dikarenakan kuota peserta yang terbatas atau ketidaksesuaian dengan kriteria event.</p><p>Kami sangat menghargai minat Anda dan berharap dapat menyambut Anda di event mendatang.</p>`)}', NULL, NULL, NULL),
        ($7, 'Pengiriman Tiket (WhatsApp)', 'ticket_delivery', 'whatsapp', NULL,
         '🎫 Halo *{{name}}*,\n\nBerikut tiket Anda untuk *{{event_title}}*.\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nKode Tiket: *{{token}}*\n\nLihat tiket lengkap:\n{{ticket_link}}\n\n_Tunjukkan kode ini saat check-in._', NULL, NULL, NULL),
        ($8, 'Pengiriman Tiket (Email)', 'ticket_delivery', 'email',
         'Tiket Anda: {{event_title}}',
         '${EMAIL_WRAP("🎫 Tiket Event Anda", "Registrasi Anda telah disetujui",
         `<p>Halo <strong>{{name}}</strong>,</p><p>Selamat! Registrasi Anda untuk event berikut telah disetujui. Klik tombol di bawah untuk melihat tiket dan tunjukkan kepada staf saat check-in.</p><div class="info-box"><div class="label">Event</div><div class="value"><strong>{{event_title}}</strong></div><div class="label" style="margin-top:8px">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0"><p style="margin:0 0 12px;color:#0369a1;font-size:14px;font-weight:500">📱 Tiket Digital Anda</p><a href="{{ticket_link}}" class="cta">Lihat Tiket Saya</a></div><div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin:20px 0"><h4 style="margin:0 0 8px;color:#92400e;font-size:14px">📌 Petunjuk Check-in</h4><ol style="margin:0;padding-left:20px;color:#78350f;font-size:13px;line-height:1.6"><li>Klik tombol <strong>"Lihat Tiket Saya"</strong></li><li>Halaman tiket akan menampilkan QR Code</li><li>Tunjukkan QR Code kepada staf saat check-in</li></ol></div><p style="font-size:13px;color:#64748b"><strong>Catatan:</strong> Simpan email ini atau screenshot halaman tiket. Tiket hanya berlaku satu kali.</p>`)}', NULL, NULL, NULL),
        ($9, 'Pembatalan Event (WhatsApp)', 'cancellation', 'whatsapp', NULL,
         '⚠️ Pemberitahuan Penting\n\nHalo {{name}},\n\nDengan berat hati kami informasikan bahwa event *{{event_title}}* pada {{date}} *dibatalkan*.\n\nKami akan menghubungi Anda untuk informasi lebih lanjut mengenai pengembalian dana atau jadwal pengganti.\n\n_Mohon maaf atas ketidaknyamanannya._', NULL, NULL, NULL),
        ($10, 'Pembatalan Event (Email)', 'cancellation', 'email',
         'Pemberitahuan: {{event_title}} Dibatalkan',
         '${EMAIL_WRAP("⚠️ Pemberitahuan Penting", "Mohon maaf atas ketidaknyamanan",
         `<p>Halo <strong>{{name}}</strong>,</p><p>Dengan berat hati kami informasikan bahwa event <strong style="color:#dc2626">{{event_title}}</strong> yang dijadwalkan pada <strong>{{date}}</strong> di <strong>{{venue}}</strong> <strong>dibatalkan</strong>.</p><p>Kami akan menghubungi Anda secara terpisah untuk informasi lebih lanjut mengenai:</p><ul style="color:#475569;font-size:14px;line-height:1.8"><li>Pengembalian dana (jika berlaku)</li><li>Jadwal event pengganti (jika ada)</li></ul><p>Kami sangat menyesal atas ketidaknyamanan ini dan berterima kasih atas pengertian Anda.</p>`)}', NULL, NULL, NULL),
        ($11, 'Pengingat Event (WhatsApp)', 'reminder', 'whatsapp', NULL,
         '🔔 Pengingat Event\n\nHalo {{name}},\n\nEvent *{{event_title}}* tinggal *{{days}} hari lagi!*\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nPastikan Anda sudah membawa tiket. Sampai jumpa!', NULL, NULL, NULL),
        ($12, 'Pengingat Event (Email)', 'reminder', 'email',
         'Pengingat: {{event_title}}',
         '${EMAIL_WRAP("🔔 Pengingat Event", "Event Anda segera tiba",
         `<p>Halo <strong>{{name}}</strong>,</p><p>Ini adalah pengingat bahwa event <strong>{{event_title}}</strong> tinggal <strong style="color:#2563eb">{{days}} hari lagi</strong>!</p><div class="info-box"><div class="label">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><p>Pastikan Anda sudah membawa tiket dan dokumen pendukung. Jika Anda belum memiliki tiket, silakan periksa email sebelumnya.</p><p style="font-size:13px;color:#64748b">Kami menantikan kehadiran Anda!</p>`)}', NULL, NULL, NULL)
    `, [createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId(), createId()])
    console.log('✓ Seeded 12 templates (6 types × 2 channels)')

    await client.query('COMMIT')
    console.log('Seed complete.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const run = async () => {
  // Run migrations first to ensure schema is up to date
  console.log('Running migrations before seeding...')
  await runMigrations(pool)

  if (isDemo) {
    await seedDemo(pool)
  } else {
    await seed()
  }
  await pool.end()
}

run().catch((err: unknown) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
