# EM . U — System Design & Cost Analysis

**Project:** EM . U — Event Management Platform for KADA
**Version:** 2.1 (Updated 2026-04-13)

> Kurs referensi: **1 USD ≈ Rp 16.300** (April 2026)

---

## Table of Contents

1. [Apa itu EM . U?](#1-apa-itu-em--u)
2. [Alur Bisnis](#2-alur-bisnis)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Fitur yang Sudah Dibangun](#4-fitur-yang-sudah-dibangun)
5. [Analisis Biaya](#5-analisis-biaya)

---

## 1. Apa itu EM . U?

EM . U adalah platform manajemen event B2B yang dibangun untuk KADA. Platform ini menggantikan proses manual — menyimpan kontak di spreadsheet, mengirim undangan satu per satu, dan mencatat kehadiran secara terpisah — menjadi satu sistem terintegrasi.

**Apa yang bisa dilakukan EM . U:**
- Menyimpan dan mengelola database kontak
- Mengirim undangan email ke segmen audiens yang ditargetkan
- Menerima pendaftaran peserta lewat halaman publik
- Menyetujui pendaftaran dan menerbitkan tiket QR
- Check-in peserta di pintu masuk
- Menampilkan analitik dan insight AI setelah event selesai

---

## 2. Alur Bisnis

Ini adalah perjalanan lengkap dari kontak hingga laporan event:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. KONTAK                                                       │
│     Upload Excel (.xlsx) → normalisasi berbasis aturan → tersimpan  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. BUAT EVENT                                                   │
│     Admin buat event → set kapasitas, tanggal, lokasi           │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. KIRIM UNDANGAN (BLAST)                                       │
│     Pilih segmen target → kirim email blast → lacak pengiriman  │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. PENDAFTARAN                                                  │
│     Tamu buka halaman publik → isi form → dapat email konfirmasi│
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. PERSETUJUAN                                                  │
│     Admin review → setujui/tolak → tamu disetujui dapat QR     │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. CHECK-IN                                                     │
│     Staf scan QR di pintu → kehadiran tercatat real-time        │
│     Tamu walk-in (OTS) bisa didaftarkan langsung di tempat      │
└────────────────────────────┬────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. ANALITIK & LAPORAN                                           │
│     Funnel, demografi, health score, insight AI (cache 7 hari)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Arsitektur Sistem

Sistem EM . U terdiri dari tiga lapisan utama:

### Lapisan 1 — Antarmuka (Frontend)

**Next.js** — aplikasi web yang berjalan di browser admin.

Bertanggung jawab untuk:
- Menampilkan semua halaman dashboard, event, kontak, analitik
- Mengirim request ke API untuk mengambil dan menyimpan data
- Menangani state UI secara lokal (form, filter, pagination)

Tidak menyimpan data apapun secara permanen — semua data ada di API.

### Lapisan 2 — Logika Bisnis (Backend API)

**Fastify** — server API yang berjalan di Node.js.

Bertanggung jawab untuk:
- Memproses semua operasi bisnis (setujui pendaftaran, kirim email, hitung statistik)
- Mengautentikasi request menggunakan JWT
- Menghubungkan frontend dengan database dan layanan eksternal
- Mengorkestrasi alur kerja multi-langkah (misal: setujui → kirim email → generate QR)

### Lapisan 3 — Penyimpanan Data

| Komponen | Teknologi | Fungsi |
|---|---|---|
| **Database Utama** | PostgreSQL | Semua data persisten: kontak, event, pendaftaran, blast log |
| **Cache** | Redis | Hasil insight AI (TTL 7 hari), rate limiting |

### Lapisan 4 — SSL & Reverse Proxy

**Nginx + Let's Encrypt (Certbot)** — berjalan di VPS di luar Docker.

- Menerima semua traffic HTTPS pada port 443
- Sertifikat SSL dikelola otomatis oleh Certbot (diperbarui setiap 90 hari)
- Meneruskan request ke container aplikasi di port lokal

Setup satu perintah:
```bash
make ssl-init DOMAIN=your.domain.com EMAIL=admin@your.domain.com
```

### Layanan Eksternal

| Layanan | Provider | Fungsi |
|---|---|---|
| **AI Insights** | OpenAI GPT atau Groq | Generate insight post-event per event selesai; hasil di-cache Redis 7 hari |
| **Email** | Brevo API | Kirim email blast undangan (up to 9.000/bulan gratis) |
| **Email** | AWS SES (SMTP) | Alternatif email — cocok untuk volume tinggi, biaya rendah |
| **Email** | GCP Workspace SMTP | Alternatif email — via Google SMTP relay |

### Diagram Arsitektur

```
┌──────────────────────────────────────────────┐
│              BROWSER ADMIN                   │
│          Next.js (React/TypeScript)          │
│                                              │
│  Dashboard │ Events │ Contacts │ Analytics   │
└──────────────────┬───────────────────────────┘
                   │ HTTPS/REST
┌──────────────────▼───────────────────────────┐
│              API SERVER                      │
│         Fastify (Node.js / Bun)              │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Auth &  │  │  Event & │  │ Contact & │  │
│  │  Users   │  │ Pipeline │  │   ETL     │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│                                              │
│  ┌──────────┐  ┌──────────┐                 │
│  │  Blast & │  │Analytics │                 │
│  │  Email   │  │& Reports │                 │
│  └──────────┘  └──────────┘                 │
└───────┬──────────────┬──────────────┬────────┘
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌───▼────────────────────────┐
│  PostgreSQL  │ │   Redis    │ │    External Services       │
│              │ │            │ │                            │
│ contacts     │ │ AI insight │ │ OpenAI GPT / Groq          │
│ events       │ │ cache 7d   │ │ (insight post-event only)  │
│ registrations│ │            │ │                            │
│ blast_logs   │ │            │ │ Brevo API / AWS SES /      │
│ surveys      │ │            │ │ GCP SMTP (email delivery)  │
└──────────────┘ └────────────┘ └────────────────────────────┘
         ↑
┌────────┴─────────────────────────────────────┐
│  Nginx + Let's Encrypt (VPS, di luar Docker) │
│  SSL termination → proxy ke port lokal       │
└──────────────────────────────────────────────┘
```

---

## 4. Fitur yang Sudah Dibangun

### Manajemen Kontak
- Upload kontak via Excel (.xlsx)
- Normalisasi berbasis aturan (format nomor telepon, kapitalisasi nama, standarisasi kota) — tanpa AI
- Deteksi duplikat dan saran penggabungan
- Tagging dan segmentasi kontak berdasarkan industri, kota, perusahaan
- Health bar kualitas data kontak
- UI review normalisasi dengan opsi override manual

### Manajemen Event
- Buat dan konfigurasi event (kapasitas, tanggal, lokasi, deskripsi)
- Siklus hidup event: Draft → Published → Ongoing → Completed → Archived
- Clone event sebagai template
- Survey builder (pertanyaan kustom untuk pendaftaran atau check-in)

### Blast Undangan
- Compose email blast dengan template editor
- Target audiens berdasarkan segmen (industri, kota, tag, dll.)
- Jadwalkan pengiriman blast
- Lacak pengiriman: terkirim, dibuka, bounced
- Emergency blast untuk pembaruan mendadak

### Pendaftaran Peserta
- Halaman pendaftaran publik (mobile-friendly)
- Form pendaftaran multi-langkah
- Konfirmasi email double opt-in
- Antrian persetujuan untuk admin
- Waitlist dengan promosi otomatis saat slot tersedia
- Generate tiket QR untuk peserta yang disetujui

### Check-in
- Scanner QR code (bekerja offline via PWA)
- Registrasi walk-in on-the-spot (OTS)
- Counter kehadiran live

### Dashboard Analitik (per event)
- Funnel pendaftaran: Undangan → Daftar → Disetujui → Hadir
- Breakdown demografi (industri, kota, ukuran perusahaan)
- Peta segmen overlap (kombinasi industri × kota yang paling banyak hadir)
- Event Health Score — skor komposit dari tingkat kehadiran, no-show, dan konversi undangan
- Insight post-event berbasis AI (OpenAI GPT atau Groq, cache Redis 7 hari)
- Export PDF dan Excel

### Akses & Keamanan
- Login admin dengan JWT
- Role-based guards (admin vs. viewer)
- Penugasan event per pengguna

---

## 5. Analisis Biaya

### 5.1 Asumsi Penggunaan

**Tier Kontak:**

| Tier | Total Kontak | Gambaran Pengguna |
|---|---|---|
| Starter | ~1.000 | Organisasi kecil, baru mulai |
| Growing | ~5.000 | Chapter KADA yang aktif |
| Scale | ~20.000 | Operasi KADA regional atau nasional |

**Volume Event per Bulan:**

| Tingkat Aktivitas | Event/Bulan |
|---|---|
| Rendah | 2–5 event |
| Sedang | 5–15 event |
| Tinggi | 15–30 event |

**Blast Email per Event:**
- List undangan = 100–150% dari kapasitas event
- Contoh: kapasitas 200 → kirim blast ke 200–300 kontak per event

**Penggunaan AI:**
- ETL/normalisasi kontak: **tidak menggunakan AI** — menggunakan normalisasi berbasis aturan (gratis)
- Insight post-event: 1 panggilan API per event selesai, hasilnya di-cache Redis 7 hari (tampil ulang = gratis)

---

### 5.2 Referensi Harga Layanan

#### AI Insights — OpenAI GPT atau Groq

AI hanya digunakan untuk satu fungsi: **generate insight setelah event selesai**. ETL/normalisasi kontak tidak menggunakan AI.

EM . U mendukung dua provider AI yang dapat dikonfigurasi dari halaman Settings:

| Provider | Model | Harga Input | Harga Output | Catatan |
|---|---|---|---|---|
| **OpenAI** | GPT-4o | $2,50 / 1M token | $10,00 / 1M token | Kualitas tinggi, stabil |
| **OpenAI** | GPT-4o mini | $0,15 / 1M token | $0,60 / 1M token | Hemat, cukup untuk insight |
| **Groq** | llama-3.3-70b | $0,59 / 1M token | $0,79 / 1M token | Sangat cepat, biaya rendah |
| **Groq** | mixtral-8x7b | $0,24 / 1M token | $0,24 / 1M token | Paling hemat |

Estimasi token per insight:
- ~2.000 token input + ~1.500 token output per event
- GPT-4o mini: **~Rp 15–20/event** | Groq llama: **~Rp 10–15/event**

#### Email — Brevo, AWS SES, atau GCP SMTP

EM . U mendukung tiga provider email yang dapat dipilih dari halaman Settings:

**Brevo (direkomendasikan untuk mulai)**

| Paket | Email/Bulan | Harga |
|---|---|---|
| Free | 9.000 | **Gratis** |
| Starter | 20.000 | ~$25 (~Rp 408.000) |
| Business | 100.000 | ~$65 (~Rp 1.060.000) |
| Enterprise | 500.000+ | ~$200+ (~Rp 3.260.000+) |

**AWS SES (Simple Email Service)**

Konfigurasi: `EMAIL_PROVIDER=ses`, `SMTP_HOST=email-smtp.<region>.amazonaws.com`, port 587.

| Paket | Harga per 1.000 email | Catatan |
|---|---|---|
| Kirim dari EC2 | **Gratis** (62.000/bulan) | Hanya jika API berjalan di AWS |
| Di luar EC2 | ~$0,10 / 1.000 email (~Rp 1.630) | Pay-as-you-go, tidak ada paket bulanan |

Biaya contoh: 50.000 email/bulan = **~$5/bulan (~Rp 81.500)** — jauh lebih murah dari Brevo Business.

**GCP Workspace SMTP Relay**

Konfigurasi: `EMAIL_PROVIDER=gcp`, `SMTP_HOST=smtp-relay.gmail.com`, port 587, TLS.

| Paket | Email/Hari | Harga |
|---|---|---|
| Google Workspace Starter | 2.000/hari | $6/user/bulan (~Rp 98.000) |
| Google Workspace Business | Tidak terbatas | $12/user/bulan (~Rp 196.000) |

Cocok jika tim sudah menggunakan Google Workspace untuk email internal.

#### Opsi Hosting

| Opsi | Deskripsi |
|---|---|
| **VPS** | Server sewa tunggal (DigitalOcean, Vultr, Niagahoster). Murah, predictable. |
| **AWS** | Amazon Web Services — layanan terkelola (EC2, RDS, ElastiCache). Scalable, reliable. |
| **GCP** | Google Cloud Platform — layanan terkelola (Cloud Run, Cloud SQL, Memorystore). Mirip AWS. |

---

### 5.3 Estimasi Biaya Bulanan

Semua harga dalam **Rupiah/bulan** (dikonversi dari USD dengan kurs Rp 16.300).

---

> Tabel menggunakan Brevo sebagai pilihan email default. AWS SES menghemat 60–80% biaya email vs Brevo pada volume tinggi.

#### Tier Starter — ~1.000 Kontak

| Komponen | VPS | AWS | GCP |
|---|---|---|---|
| Hosting (server + DB) | Rp 195.000–325.000 | Rp 570.000–815.000 | Rp 490.000–735.000 |
| Redis | termasuk di VPS | Rp 245.000 | Rp 195.000 |
| AI Insights (GPT-4o mini / Groq) — Rendah | Rp 750 | sama | sama |
| AI Insights — Sedang | Rp 2.250 | sama | sama |
| AI Insights — Tinggi | Rp 4.500 | sama | sama |
| Brevo email — Rendah | **Gratis** | sama | sama |
| Brevo email — Sedang | Gratis–Rp 408.000 | sama | sama |
| Brevo email — Tinggi | Rp 408.000 | sama | sama |
| **TOTAL — Rendah** | **Rp 196.000–326.000** | **Rp 816.000–1.061.000** | **Rp 491.000–931.000** |
| **TOTAL — Sedang** | **Rp 198.000–735.000** | **Rp 818.000–1.225.000** | **Rp 493.000–1.140.000** |
| **TOTAL — Tinggi** | **Rp 608.000–738.000** | **Rp 984.000–1.228.000** | **Rp 903.000–1.143.000** |

---

#### Tier Growing — ~5.000 Kontak

Kapasitas event rata-rata diasumsikan 200–500 orang.

| Komponen | VPS | AWS | GCP |
|---|---|---|---|
| Hosting (server + DB) | Rp 325.000–650.000 | Rp 978.000–1.630.000 | Rp 897.000–1.467.000 |
| Redis | termasuk di VPS | Rp 408.000 | Rp 326.000 |
| AI Insights — Rendah | Rp 1.500 | sama | sama |
| AI Insights — Sedang | Rp 4.500 | sama | sama |
| AI Insights — Tinggi | Rp 9.000 | sama | sama |
| Email — Brevo Starter | Rp 408.000 | sama | sama |
| Email — Brevo Business (Sedang/Tinggi) | Rp 1.060.000 | sama | sama |
| Email alternatif — AWS SES (Rendah, ~10K email) | — | Rp 16.000 | — |
| Email alternatif — AWS SES (Tinggi, ~50K email) | — | Rp 81.500 | — |
| **TOTAL — Rendah (Brevo)** | **Rp 735.000–1.060.000** | **Rp 1.804.000–2.455.000** | **Rp 1.306.000–1.892.000** |
| **TOTAL — Sedang (Brevo)** | **Rp 1.389.000–1.715.000** | **Rp 2.452.000–3.099.000** | **Rp 2.288.000–2.858.000** |
| **TOTAL — Tinggi (SES, AWS hosting)** | — | **Rp 1.568.000–2.302.000** | — |

---

#### Tier Scale — ~20.000 Kontak

Kapasitas event rata-rata diasumsikan 300–2.000 orang.

| Komponen | VPS | AWS | GCP |
|---|---|---|---|
| Hosting (server + DB) | Rp 978.000–1.956.000 | Rp 2.445.000–4.890.000 | Rp 2.119.000–4.401.000 |
| Redis | Rp 163.000–326.000 | Rp 815.000 | Rp 652.000 |
| AI Insights — Rendah | Rp 3.000 | sama | sama |
| AI Insights — Sedang | Rp 9.000 | sama | sama |
| AI Insights — Tinggi | Rp 18.000 | sama | sama |
| Email — Brevo Business (~100K email) | Rp 1.060.000 | sama | sama |
| Email — Brevo Enterprise (~200K+ email) | Rp 3.260.000 | sama | sama |
| Email alternatif — AWS SES (~200K email) | — | Rp 326.000 | — |
| **TOTAL — Rendah (Brevo Business)** | **Rp 2.204.000–3.345.000** | **Rp 4.263.000–6.748.000** | **Rp 3.834.000–6.115.000** |
| **TOTAL — Tinggi (Brevo Enterprise)** | **Rp 4.419.000–5.560.000** | **Rp 6.536.000–9.981.000** | **Rp 6.049.000–9.330.000** |
| **TOTAL — Tinggi (SES, AWS hosting)** | — | **Rp 3.604.000–5.570.000** | — |

---

### 5.4 Ringkasan Biaya

| Tier | VPS + Brevo | AWS + SES | GCP + Brevo |
|---|---|---|---|
| Starter (~1K kontak) | Rp 196rb–738rb/bln | Rp 816rb–1,2jt/bln | Rp 491rb–1,1jt/bln |
| Growing (~5K kontak) | Rp 735rb–1,7jt/bln | Rp 1,6jt–3,1jt/bln | Rp 1,3jt–2,9jt/bln |
| Scale (~20K kontak) | Rp 2,2jt–5,6jt/bln | Rp 3,6jt–10jt/bln | Rp 3,8jt–9,3jt/bln |

> AWS SES menjadi pilihan paling hemat di tier Scale — kombinasi AWS hosting + SES bisa **50–60% lebih murah** dari AWS hosting + Brevo Enterprise.

---

### 5.5 Rekomendasi per Tahap

**Baru mulai (Starter):**
- VPS murah (DigitalOcean, Vultr, atau Niagahoster)
- PostgreSQL dan Redis di server yang sama
- Brevo Free (9.000 email/bulan gratis)
- AI Insights: Groq (paling hemat, ~Rp 750/bulan untuk 5 event)
- SSL: Let's Encrypt via `make ssl-init`
- **Estimasi total: Rp 200.000–400.000/bulan**

**Operasi berkembang (Growing):**
- VPS lebih besar, atau pisahkan server app dari database
- Brevo Starter → Business sesuai volume blast
- Pertimbangkan AWS SES jika blast > 20.000 email/bulan
- **Estimasi total: Rp 750.000–1.700.000/bulan**

**Skala besar (Scale):**
- AWS atau GCP untuk reliabilitas dan auto-scaling
- Managed database (RDS atau Cloud SQL) + managed Redis
- AWS SES sangat direkomendasikan untuk email volume tinggi
- **Estimasi total: Rp 2.200.000–5.600.000/bulan (VPS) atau Rp 3.600.000–10.000.000/bulan (cloud)**

---

### 5.6 Yang Tidak Termasuk dalam Perhitungan

- **Domain & SSL**: ~Rp 150.000–250.000/tahun (tidak signifikan)
- **CDN** (opsional, untuk frontend): Rp 0–325.000/bulan
- **Monitoring** (Sentry, Grafana Cloud): Rp 0–490.000/bulan
- **Biaya developer/ops**: tidak dihitung sebagai biaya layanan, tapi server VPS butuh pemeliharaan manual berkala
- **Integrasi WhatsApp**: dikecualikan dari analisis ini

---

*Dokumen ini dikelola oleh tim engineering EM . U. Terakhir diperbarui: 2026-04-12.*
