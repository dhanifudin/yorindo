# Contact Import & Normalization Flow

## Overview

This document describes the end-to-end flow of importing and managing contact data in EM · U, from uploading a spreadsheet to normalizing and reviewing flagged contacts.

---

## Phase 1: Upload Spreadsheet

### What the admin does

1. Navigate to **Contacts → Upload Data Kontak**.
2. Drag-and-drop or select an Excel file (`.xlsx`, max 10MB).
3. The system shows a preview of the first 5 rows and automatically detects columns like Nama, Telepon, Email, Perusahaan, Jabatan, and Kota.
4. If all 6 required columns are detected, the **Upload & Proses Data** button becomes active.
5. Click to upload. A progress bar shows real-time processing status.
6. When complete, the system displays how many contacts were imported and how many need review.

### What happens behind the scenes

The system reads every row from the spreadsheet and processes it:

- **Phone numbers** are converted to the Indonesian format (`+62XXXXXXXXXX`).
- **Email addresses** are validated and lowercased.
- **Names and other text** are formatted to Title Case.
- **Cities** are matched against the official Indonesian city database (e.g., `jkt` → `Jakarta Pusat`, `surabaya` → `Kota Surabaya`, `solo` → `Kota Surakarta`).

---

## Phase 2: Automatic Flagging

Not all imported contacts are perfect. The system automatically flags contacts that need attention:

| Flag | Meaning |
|---|---|
| **Perlu Tinjauan (Data Invalid)** | The contact has missing or invalid data (no phone, no name, bad email, etc.) |
| **Industri Tidak Cocok** | The industry/service type doesn't match any standard value in the system |
| **Jabatan Tidak Cocok** | The job title doesn't match any standard value |
| **Duplikat** | The system found a similar contact that may already exist |

Contacts are always imported — even if flagged. Flags are markers to help you clean the data later.

---

## Phase 3: Review Flagged Contacts

### Quick fix: Inline editing

Go to the **Perlu Tinjauan** tab. You'll see three filter options:

| Filter | Shows |
|---|---|
| **Perlu Tinjauan** | Contacts with invalid or incomplete data |
| **Email Kosong** | Contacts missing email |
| **Telepon Kosong** | Contacts missing phone |

For each contact:
1. Click **Perbarui** to open editable fields.
2. Fill in missing or incorrect information (phone auto-formats as you type).
3. Click **Simpan** to save.

### Bulk fix: Normalization tab

Go to the **Normalisasi** tab. This is where you clean up non-standard values in bulk.

#### Step 1: Choose what to normalize

Select from:
- **Industri** — standardize industry/service types
- **Jabatan** — standardize job titles
- **Kota** — standardize city names

#### Step 2: Map values

The system groups contacts by their non-standard value. For example, if 25 contacts have `perbankan` as industry but the standard value is `Keuangan & Perbankan`, you'll see one group for `perbankan` with 25 contacts.

For each group:
1. Click the dropdown to select the correct standard value.
2. Click **Lihat kontak** to expand and see sample contacts.
3. The system shows a green badge confirming your mapping.

#### Step 3: Apply

Click **Terapkan Normalisasi** to apply all mappings at once. The system updates all contacts in each group with the correct standard value.

---

## Phase 4: Manage Duplicates

Go to the **Duplikat** tab to review potential duplicate contacts. The system shows pairs of contacts that may be the same person.

For each pair:
- **Gabungkan** — merge two contacts into one, choosing which data to keep.
- **Abaikan** — dismiss the duplicate flag if they're actually different people.

---

## Phase 5: Blast to Contacts

Once your contact data is clean, you can send invitations:

1. Select contacts using checkboxes or filter by industry, city, or job title.
2. Click **Blast N kontak →** in the action toolbar.
3. Choose the event, email template, and schedule.
4. Click **Kirim Blast** to send invitations immediately or schedule for later.

---

## Standard Values Reference

The system maintains standard lists for consistent data. These are managed by admins in the **Data** section:

### Industries (15 standard values)

Teknologi Informasi & Software, Farmasi & Alat Kesehatan, Keuangan & Perbankan, Pendidikan & Pelatihan, Manufaktur & Fabrikasi, Ritel & Perdagangan, Properti & Real Estat, Otomotif & Suku Cadang, FMCG & Makanan Minuman, Bahan Kimia Industri, Tekstil & Garmen, Energi & Pertambangan, Logistik & Transportasi, Konstruksi & Infrastruktur, Telekomunikasi

### Job Titles (15 standard values)

Direktur, Manajer, Supervisor, Staf, Engineer, Analis, Konsultan, Wirausaha, Kepala Bagian / Head, Koordinator, Spesialis, Admin, Teknisi, Operator, Presiden Direktur / CEO

### Cities

Cities are synced from the official Indonesian wilayah.id database and include all kabupaten/kota across Indonesia.

---

## Registration Form

When participants register for an event, the form collects:

### Contact Information (Step 1)
- Nama Lengkap *
- Nama Perusahaan/Instansi *
- Email *
- Email Perusahaan (optional)
- No. Handphone (WA) *
- Jenis Industri Manufaktur * — with dropdown + "Lainnya (ketik manual)" option
- Jabatan — with dropdown + "Lainnya (ketik manual)" option
- Lokasi Kantor/Pabrik — dropdown of official Indonesian cities only

### Event Survey (Step 2)
- How they found out about the event
- Their expectations
- Previous event experience
- Topic interests

### Confirmation (Step 3–4)
- Review entered data
- Accept data privacy consent
- Submit registration

---

## Summary

```
Upload .xlsx → Auto-process → Flags created
    ↓
Review flagged contacts (Perlu Tinjauan tab)
    ↓
Bulk-normalize non-standard values (Normalisasi tab)
    ↓
Resolve duplicates (Duplikat tab)
    ↓
Clean data → Ready for Blast
```

The system is designed to be forgiving — **all contacts are imported**, and flags simply highlight areas where manual review can improve data quality.
