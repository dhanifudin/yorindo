/**
 * Demo Seed Script — Comprehensive demo data with relative dates
 *
 * Populates PostgreSQL with realistic Indonesian event management data.
 * All dates are computed relative to now — no hardcoded dates that go stale.
 *
 * Usage: npx tsx scripts/seed.ts --demo
 * Requires: DATABASE_URL, NODE_ENV != production
 */

import type { PoolClient } from 'pg'
import { Pool } from 'pg'
import bcrypt from 'bcrypt'
import { createId } from '@paralleldrive/cuid2'

// ─── Relative date helper ──────────────────────────────────────────────────────
const d = (days: number, hour = 9): string => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

// ─── Location mapping ──────────────────────────────────────────────────────────
const LOCATIONS: Record<string, { province_code: string; province_name: string; city_code: string; city_name: string }> = {
  Jakarta:    { province_code: '31', province_name: 'DKI Jakarta',   city_code: '31.71', city_name: 'Kota Jakarta Pusat' },
  Bandung:    { province_code: '32', province_name: 'Jawa Barat',    city_code: '32.73', city_name: 'Kota Bandung' },
  Surabaya:   { province_code: '35', province_name: 'Jawa Timur',    city_code: '35.78', city_name: 'Kota Surabaya' },
  Denpasar:   { province_code: '51', province_name: 'Bali',          city_code: '51.71', city_name: 'Kota Denpasar' },
  Yogyakarta: { province_code: '34', province_name: 'DI Yogyakarta', city_code: '34.71', city_name: 'Kota Yogyakarta' },
  Medan:      { province_code: '12', province_name: 'Sumatera Utara',city_code: '12.71', city_name: 'Kota Medan' },
  Semarang:   { province_code: '33', province_name: 'Jawa Tengah',   city_code: '33.74', city_name: 'Kota Semarang' },
  Makassar:   { province_code: '73', province_name: 'Sulawesi Selatan', city_code: '73.71', city_name: 'Kota Makassar' },
}

// ─── Indonesian name pools ─────────────────────────────────────────────────────
const FIRST_NAMES = [
  'Adi', 'Agus', 'Ahmad', 'Aisyah', 'Andi', 'Ani', 'Arief', 'Ayu', 'Bambang', 'Budi',
  'Cahya', 'Citra', 'Dedi', 'Desi', 'Dian', 'Dwi', 'Eka', 'Endang', 'Fajar', 'Fitri',
  'Galuh', 'Gita', 'Hadi', 'Hendra', 'Ida', 'Iwan', 'Joko', 'Kartini', 'Kurnia', 'Lestari',
  'Maya', 'Mega', 'Nadia', 'Nia', 'Nurul', 'Putri', 'Rahma', 'Rina', 'Rizky', 'Sari',
  'Sinta', 'Sri', 'Surya', 'Taufik', 'Tri', 'Umi', 'Wahyu', 'Wati', 'Yanti', 'Yusuf',
]
const LAST_NAMES = [
  'Pratama', 'Santoso', 'Wijaya', 'Kusuma', 'Saputra', 'Hidayat', 'Putra', 'Setiawan',
  'Handoko', 'Susanto', 'Wibowo', 'Nugroho', 'Haryanto', 'Purnama', 'Siregar', 'Harahap',
  'Situmorang', 'Nasution', 'Hutabarat', 'Simanjuntak',
]
const COMPANIES = [
  'PT Tokopedia', 'PT Gojek', 'PT Bukalapak', 'PT Traveloka', 'PT Blibli',
  'PT Telkom Indonesia', 'PT Bank BCA', 'PT Astra International', 'PT Indofood',
  'PT Pertamina', 'PT Unilever Indonesia', 'PT XL Axiata', 'PT Bank Mandiri',
  'PT Garuda Indonesia', 'PT Semen Indonesia', 'PT Kalbe Farma', 'PT Mayora Indah',
  'PT Gudang Garam', 'PT HM Sampoerna', 'PT Adaro Energy',
]
const PHONE_PREFIXES = ['+6281', '+6285', '+6287', '+62812']
const INDUSTRIES = ['teknologi', 'keuangan', 'kesehatan', 'manufaktur', 'retail', 'pendidikan']
const INDUSTRY_WEIGHTS = [30, 20, 15, 15, 10, 10] // percentage distribution
const SIZES: Array<'<50' | '50-200' | '200-1000' | '>1000'> = ['<50', '50-200', '200-1000', '>1000']
const SIZE_WEIGHTS = [25, 35, 25, 15]
const JOB_TITLES = ['direktur', 'manajer', 'supervisor', 'staf', 'engineer', 'analis', 'konsultan', 'wirausaha']
const CITIES = ['Jakarta', 'Jakarta', 'Jakarta', 'Bandung', 'Bandung', 'Surabaya', 'Denpasar', 'Yogyakarta', 'Medan', 'Semarang']

// ─── Weighted random helper ────────────────────────────────────────────────────
function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ─── Event definitions ─────────────────────────────────────────────────────────
interface EventDef {
  name: string; slug: string; status: string; dateOffset: number; city: string
  venue: string; capacity: number; isPaid: boolean; price: number | null
  regCount: number; attendedCount: number; pendingCount: number; surveyCount: number
}

const EVENTS: EventDef[] = [
  { name: 'TechConf Jakarta 2026',     slug: 'techconf-jakarta-2026',     status: 'active',    dateOffset: -1,   city: 'Jakarta',    venue: 'Jakarta Convention Center', capacity: 500, isPaid: false, price: null, regCount: 80, attendedCount: 42, pendingCount: 0, surveyCount: 0 },
  { name: 'AI Summit Bandung',          slug: 'ai-summit-bandung',         status: 'active',    dateOffset: 2,    city: 'Bandung',    venue: 'Trans Convention Hall',     capacity: 200, isPaid: true,  price: 150000, regCount: 120, attendedCount: 0, pendingCount: 0, surveyCount: 0 },
  { name: 'ERP Workshop Surabaya',      slug: 'erp-workshop-surabaya',     status: 'published', dateOffset: 14,   city: 'Surabaya',   venue: 'Hotel Majapahit',           capacity: 80,  isPaid: true,  price: 75000, regCount: 35, attendedCount: 0, pendingCount: 5, surveyCount: 0 },
  { name: 'Fintech Networking Bali',    slug: 'fintech-networking-bali',   status: 'published', dateOffset: 30,   city: 'Denpasar',   venue: 'Bali Nusa Dua Convention',  capacity: 150, isPaid: false, price: null, regCount: 20, attendedCount: 0, pendingCount: 0, surveyCount: 0 },
  { name: 'Cloud Conference Jakarta',   slug: 'cloud-conference-jakarta',  status: 'draft',     dateOffset: 60,   city: 'Jakarta',    venue: 'ICE BSD',                   capacity: 300, isPaid: false, price: null, regCount: 0, attendedCount: 0, pendingCount: 0, surveyCount: 0 },
  { name: 'Data Summit Yogyakarta',     slug: 'data-summit-yogyakarta',    status: 'draft',     dateOffset: 90,   city: 'Yogyakarta', venue: 'Royal Ambarrukmo',          capacity: 100, isPaid: false, price: null, regCount: 0, attendedCount: 0, pendingCount: 0, surveyCount: 0 },
  { name: 'DevOps Meetup Jakarta',      slug: 'devops-meetup-jakarta',     status: 'completed', dateOffset: -30,  city: 'Jakarta',    venue: 'WeWork Sudirman',           capacity: 60,  isPaid: false, price: null, regCount: 55, attendedCount: 42, pendingCount: 0, surveyCount: 20 },
  { name: 'Marketing Forum Bandung',    slug: 'marketing-forum-bandung',   status: 'completed', dateOffset: -60,  city: 'Bandung',    venue: 'Padma Hotel',               capacity: 200, isPaid: false, price: null, regCount: 150, attendedCount: 98, pendingCount: 0, surveyCount: 30 },
  { name: 'HR Tech Summit',             slug: 'hr-tech-summit',            status: 'cancelled', dateOffset: -15,  city: 'Jakarta',    venue: 'Ritz Carlton Pacific Place', capacity: 120, isPaid: false, price: null, regCount: 15, attendedCount: 0, pendingCount: 0, surveyCount: 0 },
  { name: 'Startup Pitch Night',        slug: 'startup-pitch-night',       status: 'archived',  dateOffset: -180, city: 'Jakarta',    venue: 'Block71 Jakarta',           capacity: 250, isPaid: false, price: null, regCount: 200, attendedCount: 145, pendingCount: 0, surveyCount: 25 },
]

// ─── Main seed function ────────────────────────────────────────────────────────
export async function seedDemo(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ── Clean slate ──
    await client.query(`
      TRUNCATE industries, job_titles, vendors, contacts, events, registrations,
               users, user_events, flagged_records, audit_logs, consent_records, survey_responses
      CASCADE
    `)
    console.log('✓ Truncated all tables')

    // ── Industries ──
    const industryIds: Record<string, string> = {}
    for (const slug of INDUSTRIES) {
      const id = createId()
      industryIds[slug] = id
      await client.query(
        `INSERT INTO industries (id, slug, name) VALUES ($1, $2, $3)`,
        [id, slug, slug.charAt(0).toUpperCase() + slug.slice(1)]
      )
    }
    console.log(`✓ Seeded ${INDUSTRIES.length} industries`)

    // ── Job Titles ──
    const jobTitleIds: Record<string, string> = {}
    for (const slug of JOB_TITLES) {
      const id = createId()
      jobTitleIds[slug] = id
      await client.query(
        `INSERT INTO job_titles (id, slug, name) VALUES ($1, $2, $3)`,
        [id, slug, slug.charAt(0).toUpperCase() + slug.slice(1)]
      )
    }
    console.log(`✓ Seeded ${JOB_TITLES.length} job titles`)

    // ── Vendors ──
    const vendorIds: string[] = []
    const vendorData = [
      { name: 'PT Event Pro Indonesia', contact: 'Budi Santoso', phone: '+6281234567890', email: 'budi@eventpro.id' },
      { name: 'Kreatif Dekor Jakarta', contact: 'Sari Dewi', phone: '+6285234567891', email: 'sari@kreatifdekor.id' },
      { name: 'Catering Nusantara', contact: 'Agus Wijaya', phone: '+6287234567892', email: 'agus@cateringnusantara.id' },
    ]
    for (const v of vendorData) {
      const id = createId()
      vendorIds.push(id)
      await client.query(
        `INSERT INTO vendors (id, name, contact, phone, email) VALUES ($1, $2, $3, $4, $5)`,
        [id, v.name, v.contact, v.phone, v.email]
      )
    }
    console.log(`✓ Seeded ${vendorData.length} vendors`)

    // ── Users ──
    const passwordHash = await bcrypt.hash('Password123!', 10)
    const userIds = { admin: createId(), staff: createId(), viewer: createId() }
    await client.query(`
      INSERT INTO users (id, email, password_hash, role, name) VALUES
        ($1, 'admin@yorindo.id', $4, 'admin', 'Admin Yorindo'),
        ($2, 'staff@yorindo.id', $4, 'staff', 'Staff Yorindo'),
        ($3, 'viewer@yorindo.id', $4, 'viewer', 'Viewer Yorindo')
    `, [userIds.admin, userIds.staff, userIds.viewer, passwordHash])
    console.log('✓ Seeded 3 users (admin, staff, viewer — password: Password123!)')

    // ── Events ──
    const eventIds: string[] = []
    for (const ev of EVENTS) {
      const id = createId()
      eventIds.push(id)
      await client.query(`
        INSERT INTO events (id, name, slug, date, city, venue, capacity, status, is_paid, price, registration_closed, vendor_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        id, ev.name, ev.slug, d(ev.dateOffset), ev.city, ev.venue, ev.capacity, ev.status,
        ev.isPaid, ev.price,
        ['completed', 'cancelled', 'archived'].includes(ev.status),
        ev.status !== 'draft' ? pick(vendorIds) : null,
      ])
    }
    console.log(`✓ Seeded ${EVENTS.length} events`)

    // ── Assign staff to active/published events ──
    const activePublishedEventIds = eventIds.filter((_, i) => ['active', 'published'].includes(EVENTS[i].status))
    for (const eid of activePublishedEventIds) {
      await client.query(
        `INSERT INTO user_events (id, user_id, event_id, granted_by) VALUES ($1, $2, $3, $4)`,
        [createId(), userIds.staff, eid, userIds.admin]
      )
    }
    console.log(`✓ Assigned staff to ${activePublishedEventIds.length} events`)

    // ── Contacts (~500) ──
    const contactIds: string[] = []
    const contactCount = 500
    for (let i = 0; i < contactCount; i++) {
      const id = createId()
      contactIds.push(id)
      const firstName = pick(FIRST_NAMES)
      const lastName = pick(LAST_NAMES)
      const name = `${firstName} ${lastName}`
      const city = pick(CITIES)
      const loc = LOCATIONS[city]
      const industry = weightedPick(INDUSTRIES, INDUSTRY_WEIGHTS)
      const jobTitle = pick(JOB_TITLES)
      const size = weightedPick(SIZES, SIZE_WEIGHTS)
      const prefix = pick(PHONE_PREFIXES)
      const phone = `${prefix}${String(10000000 + i).slice(-8)}`
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`
      const isOptedOut = i < 15 // ~15 opted-out contacts
      const completeness = (0.4 + Math.random() * 0.6).toFixed(3)

      await client.query(`
        INSERT INTO contacts (
          id, name, phone, email, city, company, company_size, source, consent_status,
          industry_id, job_title_id, completeness_score,
          province_code, province_name, city_code, city_name
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      `, [
        id, name, phone, email, city, pick(COMPANIES), size,
        pick(['excel_upload', 'form', 'manual']),
        isOptedOut ? 'suppressed' : 'active',
        industryIds[industry], jobTitleIds[jobTitle], completeness,
        loc?.province_code ?? null, loc?.province_name ?? null,
        loc?.city_code ?? null, loc?.city_name ?? null,
      ])
    }
    console.log(`✓ Seeded ${contactCount} contacts (${15} suppressed/opted-out)`)

    // ── Consent records for opted-out contacts ──
    for (let i = 0; i < 15; i++) {
      await client.query(
        `INSERT INTO consent_records (id, contact_id, consent_status, purpose) VALUES ($1, $2, 'suppressed', 'User requested opt-out')`,
        [createId(), contactIds[i]]
      )
    }
    console.log('✓ Seeded 15 consent records (suppressed)')

    // ── Registrations ──
    let regIdx = 0
    let totalRegs = 0
    for (let ei = 0; ei < EVENTS.length; ei++) {
      const ev = EVENTS[ei]
      if (ev.regCount === 0) continue
      const eventId = eventIds[ei]

      for (let r = 0; r < ev.regCount; r++) {
        const contactId = contactIds[(regIdx + 15) % contactIds.length] // skip opted-out contacts
        regIdx++
        const regId = createId()

        let status: string
        let attendanceStatus: string | null = null
        let checkInMethod: string | null = null
        let approvedAt: string | null = null
        let attendedAt: string | null = null

        if (r < ev.attendedCount) {
          status = 'approved'
          attendanceStatus = 'attended'
          checkInMethod = r % 3 === 0 ? 'manual' : 'qr'
          approvedAt = d(ev.dateOffset - 5)
          attendedAt = d(ev.dateOffset, 10 + (r % 6))
        } else if (r < ev.regCount - ev.pendingCount) {
          status = 'approved'
          approvedAt = d(ev.dateOffset - 3)
          if (['completed', 'archived'].includes(ev.status)) {
            attendanceStatus = 'no_show'
          }
        } else {
          status = 'pending'
        }

        await client.query(`
          INSERT INTO registrations (id, contact_id, event_id, status, attendance_status, check_in_method, approved_at, attended_at, checked_in_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          regId, contactId, eventId, status,
          attendanceStatus, checkInMethod, approvedAt, attendedAt,
          checkInMethod ? userIds.staff : null,
        ])
        totalRegs++
      }
    }
    console.log(`✓ Seeded ${totalRegs} registrations`)

    // ── Survey responses for completed/archived events ──
    let totalSurveys = 0
    for (let ei = 0; ei < EVENTS.length; ei++) {
      const ev = EVENTS[ei]
      if (ev.surveyCount === 0) continue
      const eventId = eventIds[ei]

      // Get registration IDs for this event
      const regRows = await client.query(
        `SELECT id FROM registrations WHERE event_id = $1 AND attendance_status = 'attended' LIMIT $2`,
        [eventId, ev.surveyCount]
      )

      for (const reg of regRows.rows) {
        await client.query(`
          INSERT INTO survey_responses (id, event_id, registration_id, survey_type, answers)
          VALUES ($1, $2, $3, 'post-event', $4)
        `, [
          createId(), eventId, reg.id,
          JSON.stringify({
            rating: Math.floor(Math.random() * 3) + 3, // 3-5
            topik_favorit: pick(['AI & ML', 'Cloud Native', 'DevOps', 'Data Engineering', 'Security']),
            saran: pick(['Sangat bermanfaat', 'Perlu lebih banyak sesi networking', 'Topik sangat relevan', 'Waktu kurang panjang']),
          }),
        ])
        totalSurveys++
      }
    }
    console.log(`✓ Seeded ${totalSurveys} survey responses`)

    // ── Flagged records (8 total: 4 duplicate, 4 invalid-data) ──
    for (let i = 0; i < 8; i++) {
      const isDuplicate = i < 4
      await client.query(`
        INSERT INTO flagged_records (id, raw_data, flags, status)
        VALUES ($1, $2, $3, 'pending')
      `, [
        createId(),
        JSON.stringify({
          name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          phone: isDuplicate ? `+6281200000${String(i).padStart(3, '0')}` : `invalid-phone-${i}`,
          email: isDuplicate ? `duplicate${i}@example.com` : '',
          company: pick(COMPANIES),
        }),
        JSON.stringify(isDuplicate
          ? [{ type: 'duplicate', field: 'phone', message: 'Phone matches existing contact' }]
          : [{ type: 'invalid-data', field: i % 2 === 0 ? 'phone' : 'email', message: 'Invalid format' }]
        ),
      ])
    }
    console.log('✓ Seeded 8 flagged records (4 duplicate, 4 invalid-data)')

    await client.query('COMMIT')
    console.log('\n── Seed complete ──')

    // ── Self-validation ──
    await validate(client)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ─── Validation ────────────────────────────────────────────────────────────────
async function validate(client: PoolClient): Promise<void> {
  console.log('\n── Running validation ──')
  let passed = 0
  let failed = 0

  async function check(label: string, query: string, predicate: (count: number) => boolean): Promise<void> {
    const res = await client.query(query)
    const count = parseInt(res.rows[0].count, 10)
    if (predicate(count)) {
      console.log(`  ✅ ${label}: ${count}`)
      passed++
    } else {
      console.error(`  ❌ ${label}: ${count} (FAILED)`)
      failed++
    }
  }

  await check('Total events', `SELECT count(*) FROM events`, c => c === 10)
  await check('Active events', `SELECT count(*) FROM events WHERE status = 'active'`, c => c >= 2)
  await check('Published events', `SELECT count(*) FROM events WHERE status = 'published'`, c => c >= 2)
  await check('Draft events', `SELECT count(*) FROM events WHERE status = 'draft'`, c => c >= 2)
  await check('Completed events', `SELECT count(*) FROM events WHERE status = 'completed'`, c => c >= 2)
  await check('Cancelled events', `SELECT count(*) FROM events WHERE status = 'cancelled'`, c => c >= 1)
  await check('Archived events', `SELECT count(*) FROM events WHERE status = 'archived'`, c => c >= 1)
  await check('Active events in future or today', `SELECT count(*) FROM events WHERE status = 'active' AND date >= CURRENT_DATE`, c => c >= 1)
  await check('Completed events in past', `SELECT count(*) FROM events WHERE status = 'completed' AND date < CURRENT_DATE`, c => c >= 2)
  await check('Total contacts', `SELECT count(*) FROM contacts`, c => c >= 450 && c <= 550)
  await check('Suppressed contacts', `SELECT count(*) FROM contacts WHERE consent_status = 'suppressed'`, c => c >= 10 && c <= 20)
  await check('Total users', `SELECT count(*) FROM users`, c => c === 3)
  await check('Demo admin exists', `SELECT count(*) FROM users WHERE email = 'admin@yorindo.id'`, c => c === 1)
  await check('Total registrations', `SELECT count(*) FROM registrations`, c => c >= 500)
  await check('Attended registrations', `SELECT count(*) FROM registrations WHERE attendance_status = 'attended'`, c => c >= 30)
  await check('Pending registrations', `SELECT count(*) FROM registrations WHERE status = 'pending'`, c => c >= 5)
  await check('Survey responses', `SELECT count(*) FROM survey_responses`, c => c >= 20)
  await check('Flagged records', `SELECT count(*) FROM flagged_records`, c => c >= 5 && c <= 10)
  await check('Industries', `SELECT count(*) FROM industries`, c => c >= 6)
  await check('Job titles', `SELECT count(*) FROM job_titles`, c => c >= 8)
  await check('Vendors', `SELECT count(*) FROM vendors`, c => c >= 3)

  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.error('❌ Seed validation FAILED')
    process.exit(1)
  }
  console.log('✅ Seed validation passed')
}
