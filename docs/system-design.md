# Yorindo — System Design & Cost Analysis

**Project:** Yorindo — Event Management Platform for KADA
**Version:** 2.0 (Updated 2026-04-12)

> Kurs referensi: **1 USD ≈ Rp 16.300** (April 2026)

---

## Table of Contents

1. [Apa itu Yorindo?](#1-apa-itu-yorindo)
2. [Alur Bisnis](#2-alur-bisnis)
3. [Arsitektur Sistem](#3-arsitektur-sistem)
4. [Fitur yang Sudah Dibangun](#4-fitur-yang-sudah-dibangun)
5. [Analisis Biaya](#5-analisis-biaya)

---

## 1. Apa itu Yorindo?

Yorindo adalah platform manajemen event B2B yang dibangun untuk KADA. Platform ini menggantikan proses manual — menyimpan kontak di spreadsheet, mengirim undangan satu per satu, dan mencatat kehadiran secara terpisah — menjadi satu sistem terintegrasi.

**Apa yang bisa dilakukan Yorindo:**
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
│     Upload CSV/Excel → AI bersihkan & normalisasi → tersimpan   │
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

Sistem Yorindo terdiri dari tiga lapisan utama:

### Lapisan 1 — Antarmuka (Frontend)

**Next.js** — aplikasi web yang berjalan di browser admin.

Bertanggung jawab untuk:
- Menampilkan semua halaman dashboard, event, kontak, analitik
- Mengirim request ke API untuk mengambil dan menyimpan data
- Menangani state UI secara lokal (form, filter, pagination)

Tidak menyimpan data apapun secara permanen — semua data ada di API.

### Lapisan 2 — Logika Bisnis (Backend API)

**Hono** — server API yang berjalan di Node.js/Bun.

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

### Layanan Eksternal

| Layanan | Fungsi |
|---|---|
| **Claude AI (Anthropic)** | Normalisasi data kontak saat upload; generate insight post-event |
| **Brevo** | Kirim semua email: konfirmasi, tiket QR, blast undangan |

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
│           Hono (Node.js / Bun)               │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Auth &  │  │  Event & │  │ Contact & │  │
│  │  Users   │  │ Pipeline │  │ ETL / AI  │  │
│  └──────────┘  └──────────┘  └───────────┘  │
│                                              │
│  ┌──────────┐  ┌──────────┐                 │
│  │  Blast & │  │Analytics │                 │
│  │  Email   │  │& Reports │                 │
│  └──────────┘  └──────────┘                 │
└───────┬──────────────┬──────────────┬────────┘
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌───▼────────────────┐
│  PostgreSQL  │ │   Redis    │ │  External Services │
│              │ │            │ │                    │
│ contacts     │ │ AI insight │ │ Claude AI          │
│ events       │ │ cache 7d   │ │ (normalisasi +     │
│ registrations│ │            │ │  insight)          │
│ blast_logs   │ │            │ │                    │
│ surveys      │ │            │ │ Brevo              │
└──────────────┘ └────────────┘ │ (email delivery)   │
                                └────────────────────┘
```

---

## 4. Fitur yang Sudah Dibangun

### Manajemen Kontak
- Upload kontak via CSV atau Excel
- Normalisasi berbasis AI (format nomor telepon, kapitalisasi nama, standarisasi kota)
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
- Insight post-event berbasis AI (didukung Claude, cache 7 hari)
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
- Normalisasi kontak: sekali per batch upload
- Insight post-event: 1 panggilan API per event selesai, hasilnya di-cache Redis 7 hari (tampil ulang = gratis)

---

### 5.2 Referensi Harga Layanan

#### Claude AI (Anthropic)

Yorindo menggunakan dua model berbeda untuk dua kebutuhan yang berbeda:

| Penggunaan | Model | Harga Input | Harga Output |
|---|---|---|---|
| Normalisasi kontak | Claude Haiku 4.5 | $0,80 / 1M token | $4,00 / 1M token |
| Insight post-event | Claude Sonnet 4.6 | $3,00 / 1M token | $15,00 / 1M token |

Estimasi token per operasi:
- Normalisasi per kontak: ~500 token input + ~200 token output → **~Rp 0,6/kontak**
- Insight per event: ~2.000 token input + ~1.500 token output → **~Rp 600–800/event**

#### Brevo (Email)

| Paket | Email/Bulan | Harga |
|---|---|---|
| Free | 9.000 | Gratis |
| Starter | 20.000 | ~$25 (~Rp 408.000) |
| Business | 100.000 | ~$65 (~Rp 1.060.000) |
| Enterprise | 500.000+ | ~$200+ (~Rp 3.260.000+) |

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

#### Tier Starter — ~1.000 Kontak

| Komponen | VPS | AWS | GCP |
|---|---|---|---|
| Hosting (server + DB) | Rp 195.000–325.000 | Rp 570.000–815.000 | Rp 490.000–735.000 |
| Redis | termasuk di VPS | Rp 245.000 | Rp 195.000 |
| Claude AI (normalisasi) | Rp 8.000–25.000 | sama | sama |
| Claude AI (insight) — Rendah | Rp 3.000 | sama | sama |
| Claude AI (insight) — Sedang | Rp 10.000 | sama | sama |
| Claude AI (insight) — Tinggi | Rp 20.000 | sama | sama |
| Brevo email — Rendah | Gratis | sama | sama |
| Brevo email — Sedang | Gratis–Rp 408.000 | sama | sama |
| Brevo email — Tinggi | Rp 408.000 | sama | sama |
| **TOTAL — Rendah** | **Rp 206.000–358.000** | **Rp 826.000–1.095.000** | **Rp 701.000–960.000** |
| **TOTAL — Sedang** | **Rp 213.000–758.000** | **Rp 833.000–1.498.000** | **Rp 703.000–1.378.000** |
| **TOTAL — Tinggi** | **Rp 631.000–778.000** | **Rp 1.243.000–1.498.000** | **Rp 1.113.000–1.368.000** |

---

#### Tier Growing — ~5.000 Kontak

Kapasitas event rata-rata diasumsikan 200–500 orang.

| Komponen | VPS | AWS | GCP |
|---|---|---|---|
| Hosting (server + DB) | Rp 325.000–650.000 | Rp 978.000–1.630.000 | Rp 897.000–1.467.000 |
| Redis | termasuk di VPS | Rp 408.000 | Rp 326.000 |
| Claude AI (normalisasi) | Rp 16.000–49.000 | sama | sama |
| Claude AI (insight) — Rendah | Rp 7.000 | sama | sama |
| Claude AI (insight) — Sedang | Rp 20.000 | sama | sama |
| Claude AI (insight) — Tinggi | Rp 41.000 | sama | sama |
| Brevo email — Rendah | Rp 408.000 | sama | sama |
| Brevo email — Sedang | Rp 408.000–1.060.000 | sama | sama |
| Brevo email — Tinggi | Rp 1.060.000 | sama | sama |
| **TOTAL — Rendah** | **Rp 756.000–1.114.000** | **Rp 1.801.000–2.495.000** | **Rp 1.636.000–2.300.000** |
| **TOTAL — Sedang** | **Rp 757.000–1.779.000** | **Rp 1.814.000–3.167.000** | **Rp 1.649.000–2.902.000** |
| **TOTAL — Tinggi** | **Rp 1.450.000–1.800.000** | **Rp 2.497.000–3.197.000** | **Rp 2.332.000–2.842.000** |

---

#### Tier Scale — ~20.000 Kontak

Kapasitas event rata-rata diasumsikan 300–2.000 orang.

| Komponen | VPS | AWS | GCP |
|---|---|---|---|
| Hosting (server + DB) | Rp 978.000–1.956.000 | Rp 2.445.000–4.890.000 | Rp 2.119.000–4.401.000 |
| Redis | Rp 163.000–326.000 | Rp 815.000 | Rp 652.000 |
| Claude AI (normalisasi) | Rp 49.000–130.000 | sama | sama |
| Claude AI (insight) — Rendah | Rp 13.000 | sama | sama |
| Claude AI (insight) — Sedang | Rp 41.000 | sama | sama |
| Claude AI (insight) — Tinggi | Rp 82.000 | sama | sama |
| Brevo email — Rendah | Rp 1.060.000 | sama | sama |
| Brevo email — Sedang | Rp 1.060.000–3.260.000 | sama | sama |
| Brevo email — Tinggi | Rp 3.260.000 | sama | sama |
| **TOTAL — Rendah** | **Rp 2.263.000–3.485.000** | **Rp 4.382.000–6.898.000** | **Rp 3.993.000–6.304.000** |
| **TOTAL — Sedang** | **Rp 2.291.000–5.513.000** | **Rp 4.410.000–9.346.000** | **Rp 4.021.000–8.752.000** |
| **TOTAL — Tinggi** | **Rp 5.492.000–5.754.000** | **Rp 7.601.000–9.100.000** | **Rp 7.212.000–8.508.000** |

---

### 5.4 Ringkasan Biaya

| Tier | VPS | AWS | GCP |
|---|---|---|---|
| Starter (~1K kontak) | Rp 206rb–778rb/bln | Rp 826rb–1,5jt/bln | Rp 701rb–1,4jt/bln |
| Growing (~5K kontak) | Rp 756rb–1,8jt/bln | Rp 1,8jt–3,2jt/bln | Rp 1,6jt–2,9jt/bln |
| Scale (~20K kontak) | Rp 2,3jt–5,8jt/bln | Rp 4,4jt–9,3jt/bln | Rp 4,0jt–8,8jt/bln |

---

### 5.5 Rekomendasi per Tahap

**Baru mulai (Starter):**
- Gunakan VPS dari DigitalOcean, Vultr, atau Niagahoster
- Jalankan PostgreSQL dan Redis di server yang sama
- Gunakan Brevo Free selama volume email masih rendah
- **Estimasi total: Rp 200.000–400.000/bulan**

**Operasi berkembang (Growing):**
- Upgrade ke VPS lebih besar, atau pisahkan server app dari database
- Berlangganan Brevo Starter untuk menangani volume blast yang lebih besar
- Pertimbangkan managed PostgreSQL jika butuh backup otomatis dan failover
- **Estimasi total: Rp 750.000–1.800.000/bulan**

**Skala besar (Scale):**
- Pindah ke cloud provider (AWS atau GCP) untuk reliabilitas dan auto-scaling
- Gunakan managed database (RDS atau Cloud SQL) dan managed Redis
- Upgrade Brevo ke Business atau lebih tinggi
- **Estimasi total: Rp 2.300.000–9.000.000/bulan tergantung volume event**

---

### 5.6 Yang Tidak Termasuk dalam Perhitungan

- **Domain & SSL**: ~Rp 150.000–250.000/tahun (tidak signifikan)
- **CDN** (opsional, untuk frontend): Rp 0–325.000/bulan
- **Monitoring** (Sentry, Grafana Cloud): Rp 0–490.000/bulan
- **Biaya developer/ops**: tidak dihitung sebagai biaya layanan, tapi server VPS butuh pemeliharaan manual berkala
- **Integrasi WhatsApp**: dikecualikan dari analisis ini

---

*Dokumen ini dikelola oleh tim engineering Yorindo. Terakhir diperbarui: 2026-04-12.*
