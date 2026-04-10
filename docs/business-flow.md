# EM · U — Business Flow

> Ringkasan alur bisnis platform manajemen event EM · U.
> Dokumen ini menjelaskan alur utama dari perspektif admin dan peserta.

---

## 🎯 Gambaran Umum

EM · U adalah platform manajemen event end-to-end yang membantu admin mengelola seluruh siklus event — dari persiapan hingga pelaporan pasca-event.

**Dua antarmuka utama:**
| Antarmuka | Pengguna | URL |
|-----------|----------|-----|
| **Admin Portal** | Admin, Staff, Viewer | `/app` |
| **Halaman Registrasi** | Peserta publik | `/register/{slug}` |

---

## 📋 1. Siklus Hidup Event

Setiap event melewati 6 status dengan alur transisi terkontrol:

```
                    ┌─────────────┐
                    │    Draft    │ ← Admin membuat & menyiapkan event
                    └──────┬──────┘
                           │ Publikasikan
                    ┌──────▼──────┐
                    │  Published  │ ← Pendaftaran dibuka untuk umum
                    └──────┬──────┘
                           │ Mulai Live
                    ┌──────▼──────┐
              ┌─────│   Active    │─────┐
              │     └──────┬──────┘     │
        Batalkan          │ Selesaikan  Batalkan
              │     ┌──────▼──────┐     │
              │     │  Completed  │     │
              │     └──────┬──────┘     │
              │            │ Arsipkan   │
              │     ┌──────▼──────┐     │
              └─────│  Archived   │◄────┘
                    └─────────────┘
```

### Aksi di Setiap Status

| Status | Tombol yang Muncul | Fungsi |
|--------|-------------------|--------|
| **Draft** | `Publikasikan`, `Batalkan` | Buka pendaftaran atau batalkan rencana |
| **Published** | `Mulai Live`, `Batalkan` | Event aktif, buka fitur check-in |
| **Active** | `Selesaikan`, `Batalkan` | Kelola check-in langsung di lokasi |
| **Completed** | `Arsipkan` | Event selesai, lihat laporan |
| **Cancelled** | `Arsipkan` | Event dibatalkan, simpan arsip |

> **Catatan:** Tombol "Selesaikan" hanya tersedia setelah tanggal event berlalu.

---

## 📨 2. Alur Undangan (Blast)

Admin mengirim undangan email ke kontak yang ditargetkan:

```
Pilih Kontak ──→ Pilih Template ──→ Jadwalkan/Kirim ──→ Email Terkirim
     │                │                    │                  │
  Manual/Filter   Template Email      Sekarang/Nanti    + Link Registrasi
```

### Fitur Utama
- **Seleksi kontak** — pilih manual atau berdasarkan filter (industri, kota, jabatan)
- **Template undangan** — pilih dari template email yang sudah disiapkan
- **Penjadwalan** — kirim langsung atau jadwalkan untuk nanti
- **Pelacakan** — pantau progress pengiriman real-time di halaman Tiket

---

## 📝 3. Alur Registrasi Peserta

```
Buka Link Registrasi ──→ Isi Formulir ──→ Pending/Approved
        │                      │                │
    Event Publik         Auto-fill data    Admin review
                         (jika sudah ada)   + approval
                                              │
                                        ┌─────┴─────┐
                                        │           │
                                   [Setujui]     [Tolak]
                                        │           │
                                   Tiket dikirim  Email penolakan
```

### Fitur Utama
- **Formulir publik** — peserta mengisi data di `/register/{slug}`
- **Approval queue** — admin meninjau pendaftaran di tab Registrasi
- **Bulk approval** — setujui banyak peserta sekaligus
- **Fast Mode** — toggle untuk approval tanpa konfirmasi (hemat waktu)

---

## 🎫 4. Alur Tiket

```
Admin Setujui ──→ Tiket Dikirim via Email ──→ Peserta Buka Link ──→ Tampilkan QR Code
                                                      │
                                                 /tickets/{token}
```

### Fitur Utama
- **Email otomatis** — tiket dikirim otomatis saat peserta disetujui
- **Template profesional** — HTML email dengan detail event dan tombol "Lihat Tiket Saya"
- **QR Code** — halaman tiket menampilkan QR unik untuk check-in
- **Kirim ulang** — admin bisa mengirim ulang tiket dari tab Tiket

---

## 📱 5. Alur Check-in (On-site)

```
Peserta Datang ──→ Scanner QR / Manual ──→ Status: Attended
                          │
                     Validasi tiket
                     + Catat kehadiran
```

### Cara Check-in
| Metode | Lokasi | Keterangan |
|--------|--------|------------|
| **Scanner QR** | Tab Check-in → Scanner | Scan via kamera HP (PWA) |
| **Manual** | Tab Check-in → Tabel | Cari nama/telepon, klik "Check-in" |

### Fitur Utama
- **Dashboard real-time** — statistik Hadir / Belum Hadir / % Kehadiran
- **Daftar peserta** — tab "Belum Hadir" dan "Sudah Hadir"
- **Pencarian** — filter by nama, telepon, email, atau kode tiket

---

## 📊 6. Alur Laporan

```
Event Selesai ──→ Tab Laporan (Otomatis Pindah ke Depan)
                      │
          ┌───────────┼───────────┐
          │           │           │
     Funnel Kehadiran  Demografi  Analytics AI
     (Invited→Attended) (Industri, Kota, Jabatan)
```

### Fitur Utama
- **Metric cards** — Total Diundang, Terdaftar, Disetujui, Hadir, % Kehadiran
- **Funnel chart** — visualisasi konversi dari undangan hingga kehadiran
- **Grafik demografi** — bar chart interaktif untuk industri, kota, jabatan
- **Tab otomatis pindah** — saat event `completed`, tab Laporan pindah ke posisi pertama

---

## 👥 Peran Pengguna

| Peran | Akses |
|-------|-------|
| **Admin** | Full access — kelola event, approval, blast, check-in, laporan |
| **Staff** | Check-in + Laporan event yang ditugaskan |
| **Viewer** | Baca-only — lihat overview + laporan |
| **Participant** | Hanya dashboard pribadi |

---

## 🏗️ Arsitektur Deployment

| Lingkungan | URL | Trigger | Komponen |
|------------|-----|---------|----------|
| **Stable (Demo)** | `demo.dhanifudin.com` | Tag `v*.*.*` | API + App + DB + Redis |
| **Preview** | `app.dhanifudin.com` | Push ke `main` | API + App + DB + Redis |

Kedua lingkungan berjalan independen dengan database terpisah.
