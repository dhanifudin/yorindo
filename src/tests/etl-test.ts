import { RuleBasedEtlNormalizationService } from '../services/adapters/real/RuleBasedEtlNormalizationService';

const service = new RuleBasedEtlNormalizationService();

const sampleData = [
  {
    'Nama Lengkap': 'Budi Santoso',
    'No HP / Handphone': '08123456789',
    Email: 'BUDI@EMAIL.COM',
    'Asal Kota': 'Jakarta Pusat',
  },
  {
    'Nama Lengkap': 'Siti',
    'Asal Kota': 'JKT',
  },
  {
    'Nama Lengkap': 'Andi',
    'Asal Kota': 'Jakarta Pusatt',
  },
  {
    'Nama Lengkap': 'Unknown',
    'Asal Kota': 'Kota XYZ',
  }
];

async function run() {
  const result = await service.normalizeBatch(sampleData);
  console.log(JSON.stringify(result, null, 2));
}

run();