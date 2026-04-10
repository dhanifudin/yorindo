/**
 * Seed Templates Script
 * Inserts all 12 professional templates (6 types × 2 channels) into the database.
 * Usage: npx tsx scripts/seed-templates.ts
 */
import { Pool } from 'pg'
import { createId } from '@paralleldrive/cuid2'

if (process.env.NODE_ENV === 'production') {
  console.error('Must not run in production.')
  process.exit(1)
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL required')
  process.exit(1)
}

const pool = new Pool({ connectionString: databaseUrl })

// Email wrapper with professional branded styling
const EMAIL_WRAP = (title: string, accent: string, bodyHtml: string) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:linear-gradient(135deg,#184A9A 0%,#2563EB 100%);padding:28px 24px;text-align:center}.header h1{color:#fff;margin:0 0 6px;font-size:22px;font-weight:600}.header p{color:#dbeafe;margin:0;font-size:14px}.content{padding:28px 24px}.content p{color:#475569;font-size:15px;line-height:1.6}.cta{display:inline-block;background:#184A9A;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;margin:16px 0}.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0}.info-box .label{font-weight:600;color:#64748b;font-size:13px}.info-box .value{color:#1e293b;font-size:14px;margin-top:2px}.footer{background:#f8fafc;padding:20px;text-align:center;border-top:1px solid #e2e8f0}.footer p{color:#64748b;font-size:13px;margin:4px 0}</style></head><body>
<div class="container">
  <div class="header"><h1>${title}</h1><p>${accent}</p></div>
  <div class="content">${bodyHtml}</div>
  <div class="footer"><p style="font-weight:600;color:#184A9A;margin-bottom:6px">EM · U Event Management</p><p>Email ini dikirim secara otomatis, mohon tidak membalas.</p><p>&copy; 2026 EM · U. Hak cipta dilindungi.</p></div>
</div></body></html>`

const templates = [
  // Invitation
  { name: 'Undangan Event (WhatsApp)', type: 'invitation', channel: 'whatsapp', subject: null as string | null, body: 'Halo *{{name}}*,\n\nAnda diundang ke *{{event_title}}*\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nSegera daftar melalui:\n{{registration_link}}\n\n_Kami menantikan kehadiran Anda._' },
  { name: 'Undangan Event (Email)', type: 'invitation', channel: 'email', subject: 'Undangan: {{event_title}}', body: EMAIL_WRAP('📨 Undangan Event', 'Anda mendapat undangan baru', `<p>Halo <strong>{{name}}</strong>,</p><p>Anda diundang untuk menghadiri event <strong>{{event_title}}</strong>.</p><div class="info-box"><div class="label">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><p style="text-align:center"><a href="{{registration_link}}" class="cta">Daftar Sekarang</a></p><p style="font-size:13px;color:#64748b">Klik tombol di atas untuk mendaftar. Kami menantikan kehadiran Anda.</p>`) },
  // Confirmation
  { name: 'Konfirmasi Registrasi (WhatsApp)', type: 'confirmation', channel: 'whatsapp', subject: null, body: 'Selamat *{{name}}*! 🎉\n\nRegistrasi Anda untuk *{{event_title}}* telah *disetujui*.\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nTiket akan dikirim ke email Anda. Periksa inbox Anda.' },
  { name: 'Konfirmasi Registrasi (Email)', type: 'confirmation', channel: 'email', subject: 'Konfirmasi: {{event_title}}', body: EMAIL_WRAP('✅ Registrasi Dikonfirmasi', 'Registrasi Anda telah disetujui', `<p>Halo <strong>{{name}}</strong>,</p><p>Selamat! Registrasi Anda untuk <strong>{{event_title}}</strong> telah <span style="color:#16a34a;font-weight:600">disetujui</span>.</p><div class="info-box"><div class="label">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><p>Tiket akan dikirimkan ke email ini. Silakan periksa inbox Anda secara berkala.</p><p style="font-size:13px;color:#64748b">Jika Anda memiliki pertanyaan, jangan ragu untuk menghubungi kami.</p>`) },
  // Rejection
  { name: 'Penolakan Registrasi (WhatsApp)', type: 'rejection', channel: 'whatsapp', subject: null, body: 'Halo {{name}},\n\nMohon maaf, registrasi Anda untuk *{{event_title}}* *tidak dapat kami terima*.\n\nHal ini mungkin dikarenakan kuota yang terbatas atau ketidaksesuaian kriteria.\n\n_Terima kasih atas minat Anda._' },
  { name: 'Penolakan Registrasi (Email)', type: 'rejection', channel: 'email', subject: 'Status Registrasi: {{event_title}}', body: EMAIL_WRAP('📋 Status Registrasi', 'Terima kasih atas minat Anda', `<p>Halo <strong>{{name}}</strong>,</p><p>Terima kasih telah mendaftar untuk <strong>{{event_title}}</strong>.</p><p style="color:#dc2626;font-weight:500">Mohon maaf, registrasi Anda <strong>tidak dapat kami terima</strong> pada kesempatan ini.</p><p>Hal ini mungkin dikarenakan kuota peserta yang terbatas atau ketidaksesuaian dengan kriteria event.</p><p>Kami sangat menghargai minat Anda dan berharap dapat menyambut Anda di event mendatang.</p>`) },
  // Ticket Delivery
  { name: 'Pengiriman Tiket (WhatsApp)', type: 'ticket_delivery', channel: 'whatsapp', subject: null, body: '🎫 Halo *{{name}}*,\n\nBerikut tiket Anda untuk *{{event_title}}*.\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nKode Tiket: *{{token}}*\n\nLihat tiket lengkap:\n{{ticket_link}}\n\n_Tunjukkan kode ini saat check-in._' },
  { name: 'Pengiriman Tiket (Email)', type: 'ticket_delivery', channel: 'email', subject: 'Tiket Anda: {{event_title}}', body: EMAIL_WRAP('🎫 Tiket Event Anda', 'Registrasi Anda telah disetujui', `<p>Halo <strong>{{name}}</strong>,</p><p>Selamat! Registrasi Anda untuk event berikut telah disetujui. Klik tombol di bawah untuk melihat tiket dan tunjukkan kepada staf saat check-in.</p><div class="info-box"><div class="label">Event</div><div class="value"><strong>{{event_title}}</strong></div><div class="label" style="margin-top:8px">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><div style="background:#f0f9ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin:24px 0"><p style="margin:0 0 12px;color:#0369a1;font-size:14px;font-weight:500">📱 Tiket Digital Anda</p><a href="{{ticket_link}}" class="cta">Lihat Tiket Saya</a></div><div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin:20px 0"><h4 style="margin:0 0 8px;color:#92400e;font-size:14px">📌 Petunjuk Check-in</h4><ol style="margin:0;padding-left:20px;color:#78350f;font-size:13px;line-height:1.6"><li>Klik tombol <strong>"Lihat Tiket Saya"</strong></li><li>Halaman tiket akan menampilkan QR Code</li><li>Tunjukkan QR Code kepada staf saat check-in</li></ol></div><p style="font-size:13px;color:#64748b"><strong>Catatan:</strong> Simpan email ini atau screenshot halaman tiket. Tiket hanya berlaku satu kali.</p>`) },
  // Cancellation
  { name: 'Pembatalan Event (WhatsApp)', type: 'cancellation', channel: 'whatsapp', subject: null, body: '⚠️ Pemberitahuan Penting\n\nHalo {{name}},\n\nDengan berat hati kami informasikan bahwa event *{{event_title}}* pada {{date}} *dibatalkan*.\n\nKami akan menghubungi Anda untuk informasi lebih lanjut mengenai pengembalian dana atau jadwal pengganti.\n\n_Mohon maaf atas ketidaknyamanannya._' },
  { name: 'Pembatalan Event (Email)', type: 'cancellation', channel: 'email', subject: 'Pemberitahuan: {{event_title}} Dibatalkan', body: EMAIL_WRAP('⚠️ Pemberitahuan Penting', 'Mohon maaf atas ketidaknyamanan', `<p>Halo <strong>{{name}}</strong>,</p><p>Dengan berat hati kami informasikan bahwa event <strong style="color:#dc2626">{{event_title}}</strong> yang dijadwalkan pada <strong>{{date}}</strong> di <strong>{{venue}}</strong> <strong>dibatalkan</strong>.</p><p>Kami akan menghubungi Anda secara terpisah untuk informasi lebih lanjut mengenai:</p><ul style="color:#475569;font-size:14px;line-height:1.8"><li>Pengembalian dana (jika berlaku)</li><li>Jadwal event pengganti (jika ada)</li></ul><p>Kami sangat menyesal atas ketidaknyamanan ini dan berterima kasih atas pengertian Anda.</p>`) },
  // Reminder
  { name: 'Pengingat Event (WhatsApp)', type: 'reminder', channel: 'whatsapp', subject: null, body: '🔔 Pengingat Event\n\nHalo {{name}},\n\nEvent *{{event_title}}* tinggal *{{days}} hari lagi!*\n\n📅 Tanggal: {{date}}\n📍 Lokasi: {{venue}}\n\nPastikan Anda sudah membawa tiket. Sampai jumpa!' },
  { name: 'Pengingat Event (Email)', type: 'reminder', channel: 'email', subject: 'Pengingat: {{event_title}}', body: EMAIL_WRAP('🔔 Pengingat Event', 'Event Anda segera tiba', `<p>Halo <strong>{{name}}</strong>,</p><p>Ini adalah pengingat bahwa event <strong>{{event_title}}</strong> tinggal <strong style="color:#2563eb">{{days}} hari lagi</strong>!</p><div class="info-box"><div class="label">Tanggal</div><div class="value">{{date}}</div><div class="label" style="margin-top:8px">Lokasi</div><div class="value">{{venue}}</div></div><p>Pastikan Anda sudah membawa tiket dan dokumen pendukung. Jika Anda belum memiliki tiket, silakan periksa email sebelumnya.</p><p style="font-size:13px;color:#64748b">Kami menantikan kehadiran Anda!</p>`) },
]

async function run() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM templates')
    console.log('✓ Cleared existing templates')

    for (const tpl of templates) {
      await client.query(
        'INSERT INTO templates (id, name, type, channel, subject, body) VALUES ($1, $2, $3, $4, $5, $6)',
        [createId(), tpl.name, tpl.type, tpl.channel, tpl.subject, tpl.body]
      )
    }
    console.log(`✓ Seeded ${templates.length} templates (6 types × 2 channels)`)

    const { rows } = await client.query('SELECT COUNT(*) FROM templates')
    console.log(`Total templates in DB: ${rows[0].count}`)

    await client.query('COMMIT')
    console.log('Done.')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
