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

// Realistic Indonesian industry display values (matches registration form)
const INDUSTRY_DISPLAY_NAMES: Record<string, string> = {
  teknologi: 'Elektronik & Peralatan Rumah Tangga',
  keuangan: 'Fast-Moving Consumer Goods (FMCG)',
  kesehatan: 'Farmasi & Alat Kesehatan',
  manufaktur: 'Fabrikasi Logam & Mesin Presisi',
  retail: 'Tekstil & Garmen',
  pendidikan: 'Yang lain',
}
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
               users, user_events, flagged_records, audit_logs, consent_records, survey_responses,
               duplicate_pairs
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
      // Contacts 480-489: missing email (incomplete data)
      // Contacts 490-499: missing phone (incomplete data)
      const hasEmail = i < 480 || i >= 490
      const hasPhone = i < 490
      const completeness = hasEmail && hasPhone
        ? (0.6 + Math.random() * 0.4).toFixed(3)
        : (0.2 + Math.random() * 0.3).toFixed(3)

      await client.query(`
        INSERT INTO contacts (
          id, name, phone, email, city, company, company_size, source, consent_status,
          industry_id, job_title_id, completeness_score, service_type,
          province_code, province_name, city_code, city_name
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `, [
        id, name, hasPhone ? phone : null, hasEmail ? email : null,
        city, pick(COMPANIES), size,
        pick(['excel_upload', 'form', 'manual']),
        isOptedOut ? 'suppressed' : 'active',
        industryIds[industry], jobTitleIds[jobTitle], completeness,
        INDUSTRY_DISPLAY_NAMES[industry] ?? industry,
        loc?.province_code ?? null, loc?.province_name ?? null,
        loc?.city_code ?? null, loc?.city_name ?? null,
      ])
    }
    console.log(`✓ Seeded ${contactCount} contacts (15 suppressed, 10 missing email, 10 missing phone)`)

    // ── Consent records for opted-out contacts ──
    for (let i = 0; i < 15; i++) {
      await client.query(
        `INSERT INTO consent_records (id, contact_id, consent_status, purpose) VALUES ($1, $2, 'suppressed', 'User requested opt-out')`,
        [createId(), contactIds[i]]
      )
    }
    console.log('✓ Seeded 15 consent records (suppressed)')

    // ── Duplicate contact pairs ──
    // Create 15 realistic duplicate scenarios: same person re-uploaded with slight variations
    // Phone numbers start at 600 (primary) and 700 (duplicate) to avoid collisions
    // with the auto-generated 500 contacts above (which use i=0..499).
    // Each pair has DIFFERENT phones — the duplicate is detected via name/email similarity,
    // not identical phone (identical phone would block DB insert due to UNIQUE constraint).
    const DUPLICATE_SCENARIOS = [
      { nameA: 'Budi Santoso',        nameB: 'Budi Santoso',        emailA: 'budi.santoso@gmail.com',      emailB: 'budi.santoso@yahoo.com',      phoneA: '+628120000600', phoneB: '+628120000700', score: 0.97, reasons: ['name_exact', 'email_prefix_match'] },
      { nameA: 'Sari Dewi Kusuma',    nameB: 'Sari Dewi',           emailA: 'sari.kusuma@company.co.id',   emailB: 'sari.dewi@gmail.com',         phoneA: '+628120000601', phoneB: '+628120000701', score: 0.85, reasons: ['name_similar', 'email_domain_match'] },
      { nameA: 'Ahmad Hidayat',       nameB: 'Ahmad Hidayat S.',    emailA: 'ahmad.h@tokopedia.com',       emailB: 'ahmad.hidayat@gmail.com',     phoneA: '+628120000602', phoneB: '+628120000702', score: 0.88, reasons: ['name_similar', 'email_prefix_match'] },
      { nameA: 'Putri Rahayu',        nameB: 'Putri Rahyu',         emailA: 'putri.rahayu@bandung.go.id',  emailB: 'putri.rahayu@gmail.com',      phoneA: '+628120000603', phoneB: '+628120000703', score: 0.93, reasons: ['name_similar', 'email_prefix_match'] },
      { nameA: 'Dian Purnama',        nameB: 'Dian Purnama Sari',   emailA: 'dian.p@blibli.com',           emailB: 'dianpurnama@gmail.com',       phoneA: '+628120000604', phoneB: '+628120000704', score: 0.82, reasons: ['name_similar', 'email_prefix_match'] },
      { nameA: 'Wahyu Nugroho',       nameB: 'Wahyu Nugroho',       emailA: 'wahyu@astra.co.id',           emailB: 'wahyu.nugroho@gmail.com',     phoneA: '+628120000605', phoneB: '+628120000705', score: 0.96, reasons: ['name_exact', 'email_prefix_match'] },
      { nameA: 'Rizky Pratama',       nameB: 'Rizki Pratama',       emailA: 'rizky.pratama@gmail.com',     emailB: 'rizki.p@company.id',          phoneA: '+628120000606', phoneB: '+628120000706', score: 0.79, reasons: ['name_similar', 'email_prefix_match'] },
      { nameA: 'Nurul Hidayah',       nameB: 'Nurul Hidayah',       emailA: 'nurul.hidayah@uin.ac.id',     emailB: 'nurul.hidayah@gmail.com',     phoneA: '+628120000607', phoneB: '+628120000707', score: 0.95, reasons: ['name_exact', 'email_prefix_match'] },
      { nameA: 'Eko Setiawan',        nameB: 'Eko Setiawan',        emailA: 'eko.setiawan@mandiri.co.id',  emailB: 'ekosetiawan@hotmail.com',     phoneA: '+628120000608', phoneB: '+628120000708', score: 0.87, reasons: ['name_exact', 'email_prefix_match'] },
      { nameA: 'Fitri Handayani',     nameB: 'Fitri Handayani',     emailA: 'fitri@gojek.com',             emailB: 'fitri.handayani@gmail.com',   phoneA: '+628120000609', phoneB: '+628120000709', score: 0.94, reasons: ['name_exact', 'email_prefix_match'] },
      { nameA: 'Agus Wibowo',         nameB: 'Agus Wibowo P',       emailA: 'agus.wibowo@pertamina.com',   emailB: 'aguswibowo@gmail.com',        phoneA: '+628120000610', phoneB: '+628120000710', score: 0.91, reasons: ['name_similar', 'email_prefix_match'] },
      { nameA: 'Maya Sari',           nameB: 'Maya Sari Indah',     emailA: 'maya.sari@telkom.co.id',      emailB: 'maya.sari@gmail.com',         phoneA: '+628120000612', phoneB: '+628120000712', score: 0.90, reasons: ['name_similar', 'email_prefix_match'] },
      { nameA: 'Hendra Gunawan',      nameB: 'Hendra Gunawan',      emailA: 'h.gunawan@xl.co.id',          emailB: 'hendra.gunawan@gmail.com',    phoneA: '+628120000613', phoneB: '+628120000713', score: 0.97, reasons: ['name_exact', 'email_prefix_match'] },
      { nameA: 'Rina Wulandari',      nameB: 'Rina Wulan',          emailA: 'rina.wulandari@unilever.com', emailB: 'rinawulan@gmail.com',         phoneA: '+628120000614', phoneB: '+628120000714', score: 0.89, reasons: ['name_similar', 'email_prefix_match'] },
      { nameA: 'Taufik Ismail',       nameB: 'Taufiq Ismail',       emailA: 'taufik.ismail@garuda.co.id',  emailB: 'taufiq.ismail@gmail.com',     phoneA: '+628120000615', phoneB: '+628120000715', score: 0.78, reasons: ['name_similar', 'email_prefix_match'] },
    ]

    const dupContactIds: Array<{ primaryId: string; duplicateId: string }> = []
    const dupCities = ['Jakarta', 'Bandung', 'Surabaya', 'Jakarta', 'Yogyakarta']
    for (let i = 0; i < DUPLICATE_SCENARIOS.length; i++) {
      const s = DUPLICATE_SCENARIOS[i]
      const city = dupCities[i % dupCities.length]
      const loc = LOCATIONS[city]
      const industry = weightedPick(INDUSTRIES, INDUSTRY_WEIGHTS)
      const jobTitle = pick(JOB_TITLES)

      const primaryId = createId()
      const duplicateId = createId()

      // Insert primary contact (higher completeness — has both email & phone)
      await client.query(`
        INSERT INTO contacts (
          id, name, phone, email, city, company, company_size, source, consent_status,
          industry_id, job_title_id, completeness_score, service_type,
          province_code, province_name, city_code, city_name
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `, [
        primaryId, s.nameA, s.phoneA, s.emailA, city, pick(COMPANIES), '200-1000',
        'excel_upload', 'active',
        industryIds[industry], jobTitleIds[jobTitle], '0.850',
        INDUSTRY_DISPLAY_NAMES[industry] ?? industry,
        loc?.province_code ?? null, loc?.province_name ?? null,
        loc?.city_code ?? null, loc?.city_name ?? null,
      ])

      // Insert duplicate contact (slightly different details)
      await client.query(`
        INSERT INTO contacts (
          id, name, phone, email, city, company, company_size, source, consent_status,
          industry_id, job_title_id, completeness_score, service_type,
          province_code, province_name, city_code, city_name, flag_category
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      `, [
        duplicateId, s.nameB, s.phoneB, s.emailB, city, pick(COMPANIES), '<50',
        'form', 'active',
        industryIds[industry], jobTitleIds[jobTitle], '0.650',
        INDUSTRY_DISPLAY_NAMES[industry] ?? industry,
        loc?.province_code ?? null, loc?.province_name ?? null,
        loc?.city_code ?? null, loc?.city_name ?? null,
        'duplicate',
      ])

      // Register the duplicate pair
      await client.query(`
        INSERT INTO duplicate_pairs (id, primary_id, duplicate_id, match_score, match_reasons)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        createId(), primaryId, duplicateId, s.score,
        JSON.stringify(s.reasons),
      ])

      dupContactIds.push({ primaryId, duplicateId })
      contactIds.push(primaryId, duplicateId)
    }
    console.log(`✓ Seeded ${DUPLICATE_SCENARIOS.length} duplicate contact pairs (${DUPLICATE_SCENARIOS.length * 2} contacts)`)

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

    // ── Flagged records (ETL-stage records with data quality issues) ──
    const FLAGGED_RECORDS = [
      { name: 'Budi S.', phone: 'invalid-phone', email: 'budi@company.com', flags: [{ type: 'invalid-data', field: 'phone', message: 'Phone number format is invalid' }] },
      { name: 'Sari Dewi', phone: '+6281234567890', email: 'not-an-email', flags: [{ type: 'invalid-data', field: 'email', message: 'Email format is invalid' }] },
      { name: '', phone: '+6285234567891', email: 'someone@mail.com', flags: [{ type: 'invalid-data', field: 'name', message: 'Name is empty' }] },
      { name: 'Ahmad Hidayat', phone: '+6287234567892', email: '', flags: [{ type: 'invalid-data', field: 'email', message: 'Email is required' }] },
      { name: 'UNKNOWN CONTACT', phone: '+6281234500001', email: 'unknown@test.com', flags: [{ type: 'invalid-data', field: 'name', message: 'Name appears to be a placeholder' }] },
      { name: 'Rahma Wijaya', phone: '+62811111111', email: 'rahma@gmail.com', flags: [{ type: 'invalid-data', field: 'phone', message: 'Phone number too short' }] },
    ]
    for (const rec of FLAGGED_RECORDS) {
      await client.query(`
        INSERT INTO flagged_records (id, raw_data, flags, status)
        VALUES ($1, $2, $3, 'pending')
      `, [
        createId(),
        JSON.stringify({ name: rec.name, phone: rec.phone, email: rec.email, company: pick(COMPANIES) }),
        JSON.stringify(rec.flags),
      ])
    }
    console.log(`✓ Seeded ${FLAGGED_RECORDS.length} flagged records (invalid-data from ETL)`)

    // ── Templates (all 12: 6 types × 2 channels) ──
    const templateData = [
      { id: createId(), name: 'Undangan Event (WhatsApp)', type: 'invitation', channel: 'whatsapp', subject: null, body: 'Halo {{name}}, Anda diundang ke {{event_title}} pada {{date}} di {{venue}}.' },
      { id: createId(), name: 'Undangan Event (Email)', type: 'invitation', channel: 'email', subject: 'Undangan: {{event_title}}', body: '<p>Halo {{name}},</p><p>Anda diundang ke <strong>{{event_title}}</strong> pada {{date}} di {{venue}}.</p>' },
      { id: createId(), name: 'Konfirmasi Tiket (WhatsApp)', type: 'confirmation', channel: 'whatsapp', subject: null, body: 'Selamat {{name}}! Registrasi Anda untuk {{event_title}} telah disetujui.' },
      { id: createId(), name: 'Konfirmasi Tiket (Email)', type: 'confirmation', channel: 'email', subject: 'Konfirmasi Registrasi - {{event_title}}', body: '<p>Selamat {{name}}!</p><p>Registrasi Anda untuk <strong>{{event_title}}</strong> telah disetujui.</p>' },
      { id: createId(), name: 'Penolakan (WhatsApp)', type: 'rejection', channel: 'whatsapp', subject: null, body: 'Maaf {{name}}, registrasi Anda untuk {{event_title}} tidak dapat kami terima.' },
      { id: createId(), name: 'Penolakan (Email)', type: 'rejection', channel: 'email', subject: 'Status Registrasi - {{event_title}}', body: '<p>Maaf {{name}},</p><p>Registrasi Anda untuk <strong>{{event_title}}</strong> tidak dapat kami terima.</p>' },
      { id: createId(), name: 'Pengiriman Tiket (WhatsApp)', type: 'ticket_delivery', channel: 'whatsapp', subject: null, body: 'Berikut tiket Anda untuk {{event_title}}. Token: {{token}}' },
      { id: createId(), name: 'Pengiriman Tiket (Email)', type: 'ticket_delivery', channel: 'email', subject: 'Tiket Anda - {{event_title}}', body: '<p>Berikut tiket Anda untuk <strong>{{event_title}}</strong>.</p><p>Token: {{token}}</p>' },
      { id: createId(), name: 'Pembatalan Event (WhatsApp)', type: 'cancellation', channel: 'whatsapp', subject: null, body: 'Maaf {{name}}, event {{event_title}} pada {{date}} dibatalkan.' },
      { id: createId(), name: 'Pembatalan Event (Email)', type: 'cancellation', channel: 'email', subject: 'Event Dibatalkan - {{event_title}}', body: '<p>Maaf {{name}},</p><p>Event <strong>{{event_title}}</strong> telah dibatalkan.</p>' },
      { id: createId(), name: 'Pengingat Event (WhatsApp)', type: 'reminder', channel: 'whatsapp', subject: null, body: 'Halo {{name}}, event {{event_title}} tinggal {{days}} hari lagi! Jangan lupa untuk hadir.' },
      { id: createId(), name: 'Pengingat Event (Email)', type: 'reminder', channel: 'email', subject: 'Pengingat: {{event_title}}', body: '<p>Halo {{name}},</p><p>Event <strong>{{event_title}}</strong> tinggal {{days}} hari lagi. Kami menantikan kehadiran Anda.</p>' },
    ]
    for (const tpl of templateData) {
      await client.query(
        `INSERT INTO templates (id, name, type, channel, subject, body) VALUES ($1, $2, $3, $4, $5, $6)`,
        [tpl.id, tpl.name, tpl.type, tpl.channel, tpl.subject, tpl.body]
      )
    }
    console.log(`✓ Seeded ${templateData.length} templates (6 types × 2 channels)`)

    // ── Event Sponsors ──
    let sponsorCount = 0
    for (let ei = 0; ei < EVENTS.length; ei++) {
      const ev = EVENTS[ei]
      if (['draft', 'cancelled'].includes(ev.status)) continue
      
      const eventId = eventIds[ei]
      const vendorId = pick(vendorIds)
      const tier = pick(['premium', 'standard', 'supporter'])
      
      await client.query(
        `INSERT INTO event_sponsors (id, event_id, vendor_id, tier, display_order) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (event_id, vendor_id) DO NOTHING`,
        [createId(), eventId, vendorId, tier, sponsorCount + 1]
      )
      sponsorCount++
    }
    console.log(`✓ Seeded ${sponsorCount} event-sponsor relationships`)

    // ── Blast Logs ──
    let blastCount = 0
    for (let ei = 0; ei < EVENTS.length; ei++) {
      const ev = EVENTS[ei]
      if (['draft', 'cancelled'].includes(ev.status)) continue
      
      const eventId = eventIds[ei]
      // Add 1-3 blast logs per active/completed event
      const blastCountForEvent = ev.status === 'active' || ev.status === 'completed' ? Math.floor(Math.random() * 3) + 1 : 1
      
      for (let b = 0; b < blastCountForEvent; b++) {
        const channel = pick(['email', 'whatsapp'])
        const recipientCount = Math.floor(Math.random() * 150) + 20
        const status = pick(['completed', 'completed', 'completed', 'failed'])
        const daysAgo = ev.dateOffset - (b * 3) - 2
        
        await client.query(
          `INSERT INTO blast_logs (id, event_id, channel, recipient_count, status, sent_at) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [createId(), eventId, channel, recipientCount, status, d(daysAgo)]
        )
        blastCount++
      }
    }
    console.log(`✓ Seeded ${blastCount} blast log records`)

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
  await check('Total contacts', `SELECT count(*) FROM contacts`, c => c >= 500 && c <= 600)
  await check('Suppressed contacts', `SELECT count(*) FROM contacts WHERE consent_status = 'suppressed'`, c => c >= 10 && c <= 20)
  await check('Contacts missing email', `SELECT count(*) FROM contacts WHERE email IS NULL AND deleted_at IS NULL`, c => c >= 5)
  await check('Contacts missing phone', `SELECT count(*) FROM contacts WHERE phone IS NULL AND deleted_at IS NULL`, c => c >= 5)
  await check('Duplicate pairs', `SELECT count(*) FROM duplicate_pairs WHERE resolved_at IS NULL`, c => c >= 10)
  await check('Flagged as duplicate', `SELECT count(*) FROM contacts WHERE flag_category = 'duplicate'`, c => c >= 10)
  await check('Total users', `SELECT count(*) FROM users`, c => c === 3)
  await check('Demo admin exists', `SELECT count(*) FROM users WHERE email = 'admin@yorindo.id'`, c => c === 1)
  await check('Total registrations', `SELECT count(*) FROM registrations`, c => c >= 500)
  await check('Attended registrations', `SELECT count(*) FROM registrations WHERE attendance_status = 'attended'`, c => c >= 30)
  await check('Pending registrations', `SELECT count(*) FROM registrations WHERE status = 'pending'`, c => c >= 5)
  await check('Survey responses', `SELECT count(*) FROM survey_responses`, c => c >= 20)
  await check('Flagged records (ETL)', `SELECT count(*) FROM flagged_records`, c => c >= 4 && c <= 10)
  await check('Industries', `SELECT count(*) FROM industries`, c => c >= 6)
  await check('Job titles', `SELECT count(*) FROM job_titles`, c => c >= 8)
  await check('Vendors', `SELECT count(*) FROM vendors`, c => c >= 3)
  await check('Templates', `SELECT count(*) FROM templates`, c => c >= 12)
  await check('Event sponsors', `SELECT count(*) FROM event_sponsors`, c => c >= 3)
  await check('Blast logs', `SELECT count(*) FROM blast_logs`, c => c >= 5)

  console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.error('❌ Seed validation FAILED')
    process.exit(1)
  }
  console.log('✅ Seed validation passed')
}
