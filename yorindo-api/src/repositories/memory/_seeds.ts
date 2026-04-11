/**
 * Shared seed constants for all in-memory repositories.
 *
 * IDs are pre-defined CUID2-format string literals (24 chars, lowercase
 * alphanumeric, leading letter, no hyphens) so cross-repo references stay
 * consistent across restarts.
 *
 * This module MUST NOT import from any repository.
 */

import { hashSync } from '@node-rs/bcrypt'

// ─── Password hash ─────────────────────────────────────────────────────────────
// bcrypt cost 10 — runs once at module load (~100 ms), shared across all users
export const PASSWORD123_HASH = hashSync('Password123!', 10)

// ─── User IDs (one per role) ──────────────────────────────────────────────────
export const SEED_USER_IDS = {
  admin:  'cuid2adminuser000000001x',
  staff:  'cuid2staffuser000000001x',
  viewer: 'cuid2vieweruser00000001x',
  participant: 'cuid2participantuser0001',
} as const

// ─── Vendor IDs ────────────────────────────────────────────────────────────────
export const SEED_VENDOR_IDS = [
  'cuid2vendor0000000000001',
  'cuid2vendor0000000000002',
  'cuid2vendor0000000000003',
] as const

// ─── Upload IDs ────────────────────────────────────────────────────────────────
export const SEED_UPLOAD_IDS = [
  'cuid2upload0000000000001',
  'cuid2upload0000000000002',
  'cuid2upload0000000000003',
] as const

// ─── Registration IDs (60) ───────────────────────────────────────────────────
export const SEED_REGISTRATION_IDS = [
  'cuid2reg0000000000000001',
  'cuid2reg0000000000000002',
  'cuid2reg0000000000000003',
  'cuid2reg0000000000000004',
  'cuid2reg0000000000000005',
  'cuid2reg0000000000000006',
  'cuid2reg0000000000000007',
  'cuid2reg0000000000000008',
  'cuid2reg0000000000000009',
  'cuid2reg0000000000000010',
  'cuid2reg0000000000000011',
  'cuid2reg0000000000000012',
  'cuid2reg0000000000000013',
  'cuid2reg0000000000000014',
  'cuid2reg0000000000000015',
  'cuid2reg0000000000000016',
  'cuid2reg0000000000000017',
  'cuid2reg0000000000000018',
  'cuid2reg0000000000000019',
  'cuid2reg0000000000000020',
  'cuid2reg0000000000000021',
  'cuid2reg0000000000000022',
  'cuid2reg0000000000000023',
  'cuid2reg0000000000000024',
  'cuid2reg0000000000000025',
  'cuid2reg0000000000000026',
  'cuid2reg0000000000000027',
  'cuid2reg0000000000000028',
  'cuid2reg0000000000000029',
  'cuid2reg0000000000000030',
  'cuid2reg0000000000000031',
  'cuid2reg0000000000000032',
  'cuid2reg0000000000000033',
  'cuid2reg0000000000000034',
  'cuid2reg0000000000000035',
  'cuid2reg0000000000000036',
  'cuid2reg0000000000000037',
  'cuid2reg0000000000000038',
  'cuid2reg0000000000000039',
  'cuid2reg0000000000000040',
  'cuid2reg0000000000000041',
  'cuid2reg0000000000000042',
  'cuid2reg0000000000000043',
  'cuid2reg0000000000000044',
  'cuid2reg0000000000000045',
  'cuid2reg0000000000000046',
  'cuid2reg0000000000000047',
  'cuid2reg0000000000000048',
  'cuid2reg0000000000000049',
  'cuid2reg0000000000000050',
  'cuid2reg0000000000000051',
  'cuid2reg0000000000000052',
  'cuid2reg0000000000000053',
  'cuid2reg0000000000000054',
  'cuid2reg0000000000000055',
  'cuid2reg0000000000000056',
  'cuid2reg0000000000000057',
  'cuid2reg0000000000000058',
  'cuid2reg0000000000000059',
  'cuid2reg0000000000000060',
] as const

// ─── Event IDs (12 — 2 per status) ────────────────────────────────────────────
export const SEED_EVENT_IDS = [
  'cuid2event00000000000001', // draft
  'cuid2event00000000000002', // draft
  'cuid2event00000000000003', // published
  'cuid2event00000000000004', // published
  'cuid2event00000000000005', // active
  'cuid2event00000000000006', // active
  'cuid2event00000000000007', // completed
  'cuid2event00000000000008', // completed
  'cuid2event00000000000009', // cancelled
  'cuid2event00000000000010', // cancelled
  'cuid2event00000000000011', // archived
  'cuid2event00000000000012', // archived
] as const

// ─── Contact IDs (120) ────────────────────────────────────────────────────────
export const SEED_CONTACT_IDS = [
  'cuid2contact000000000001',
  'cuid2contact000000000002',
  'cuid2contact000000000003',
  'cuid2contact000000000004',
  'cuid2contact000000000005',
  'cuid2contact000000000006',
  'cuid2contact000000000007',
  'cuid2contact000000000008',
  'cuid2contact000000000009',
  'cuid2contact000000000010',
  'cuid2contact000000000011',
  'cuid2contact000000000012',
  'cuid2contact000000000013',
  'cuid2contact000000000014',
  'cuid2contact000000000015',
  'cuid2contact000000000016',
  'cuid2contact000000000017',
  'cuid2contact000000000018',
  'cuid2contact000000000019',
  'cuid2contact000000000020',
  'cuid2contact000000000021',
  'cuid2contact000000000022',
  'cuid2contact000000000023',
  'cuid2contact000000000024',
  'cuid2contact000000000025',
  'cuid2contact000000000026',
  'cuid2contact000000000027',
  'cuid2contact000000000028',
  'cuid2contact000000000029',
  'cuid2contact000000000030',
  'cuid2contact000000000031',
  'cuid2contact000000000032',
  'cuid2contact000000000033',
  'cuid2contact000000000034',
  'cuid2contact000000000035',
  'cuid2contact000000000036',
  'cuid2contact000000000037',
  'cuid2contact000000000038',
  'cuid2contact000000000039',
  'cuid2contact000000000040',
  'cuid2contact000000000041',
  'cuid2contact000000000042',
  'cuid2contact000000000043',
  'cuid2contact000000000044',
  'cuid2contact000000000045',
  'cuid2contact000000000046',
  'cuid2contact000000000047',
  'cuid2contact000000000048',
  'cuid2contact000000000049',
  'cuid2contact000000000050',
  'cuid2contact000000000051',
  'cuid2contact000000000052',
  'cuid2contact000000000053',
  'cuid2contact000000000054',
  'cuid2contact000000000055',
  'cuid2contact000000000056',
  'cuid2contact000000000057',
  'cuid2contact000000000058',
  'cuid2contact000000000059',
  'cuid2contact000000000060',
  'cuid2contact000000000061',
  'cuid2contact000000000062',
  'cuid2contact000000000063',
  'cuid2contact000000000064',
  'cuid2contact000000000065',
  'cuid2contact000000000066',
  'cuid2contact000000000067',
  'cuid2contact000000000068',
  'cuid2contact000000000069',
  'cuid2contact000000000070',
  'cuid2contact000000000071',
  'cuid2contact000000000072',
  'cuid2contact000000000073',
  'cuid2contact000000000074',
  'cuid2contact000000000075',
  'cuid2contact000000000076',
  'cuid2contact000000000077',
  'cuid2contact000000000078',
  'cuid2contact000000000079',
  'cuid2contact000000000080',
  'cuid2contact000000000081',
  'cuid2contact000000000082',
  'cuid2contact000000000083',
  'cuid2contact000000000084',
  'cuid2contact000000000085',
  'cuid2contact000000000086',
  'cuid2contact000000000087',
  'cuid2contact000000000088',
  'cuid2contact000000000089',
  'cuid2contact000000000090',
  'cuid2contact000000000091',
  'cuid2contact000000000092',
  'cuid2contact000000000093',
  'cuid2contact000000000094',
  'cuid2contact000000000095',
  'cuid2contact000000000096',
  'cuid2contact000000000097',
  'cuid2contact000000000098',
  'cuid2contact000000000099',
  'cuid2contact000000000100',
  'cuid2contact000000000101',
  'cuid2contact000000000102',
  'cuid2contact000000000103',
  'cuid2contact000000000104',
  'cuid2contact000000000105',
  'cuid2contact000000000106',
  'cuid2contact000000000107',
  'cuid2contact000000000108',
  'cuid2contact000000000109',
  'cuid2contact000000000110',
  'cuid2contact000000000111',
  'cuid2contact000000000112',
  'cuid2contact000000000113',
  'cuid2contact000000000114',
  'cuid2contact000000000115',
  'cuid2contact000000000116',
  'cuid2contact000000000117',
  'cuid2contact000000000118',
  'cuid2contact000000000119',
  'cuid2contact000000000120',
] as const

// ─── Industry lookup ──────────────────────────────────────────────────────────
export const INDONESIAN_INDUSTRIES = [
  { id: 'ind001teknologi000000001', slug: 'teknologi',   name: 'Teknologi' },
  { id: 'ind002kesehatan000000001', slug: 'kesehatan',   name: 'Kesehatan' },
  { id: 'ind003keuangan000000001x', slug: 'keuangan',    name: 'Keuangan' },
  { id: 'ind004pendidikan00000001', slug: 'pendidikan',  name: 'Pendidikan' },
  { id: 'ind005manufaktur0000001x', slug: 'manufaktur',  name: 'Manufaktur' },
  { id: 'ind006retail000000000001', slug: 'retail',      name: 'Retail' },
  { id: 'ind007properti00000001xx', slug: 'properti',    name: 'Properti' },
] as const

// ─── Job title lookup ─────────────────────────────────────────────────────────
export const INDONESIAN_JOB_TITLES = [
  { id: 'jt001direktur000000001xx', slug: 'direktur',         name: 'Direktur' },
  { id: 'jt002manajer0000000001xx', slug: 'manajer',          name: 'Manajer' },
  { id: 'jt003supervisor00000001x', slug: 'supervisor',       name: 'Supervisor' },
  { id: 'jt004staf00000000000001x', slug: 'staf',             name: 'Staf' },
  { id: 'jt005engineer000000001xx', slug: 'engineer',         name: 'Engineer' },
  { id: 'jt006analis00000000001xx', slug: 'analis',           name: 'Analis' },
  { id: 'jt007konsultan00000001xx', slug: 'konsultan',        name: 'Konsultan' },
  { id: 'jt008wirausaha00000001xx', slug: 'wirausaha',        name: 'Wirausaha' },
] as const
