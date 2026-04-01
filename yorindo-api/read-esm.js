import { readFile } from 'fs/promises';
import * as xlsx from 'xlsx';

async function main() {
  const filePath = 'C:/Users/handr/OneDrive/Desktop/Capstone/Versii baru, biar bisa sekalian nyoba/yorindo/Sampel Data (26.3).xlsx';
  const buffer = await readFile(filePath);
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Headers:', JSON.stringify(data[0]));
  console.log('First Row Data:', JSON.stringify(data[1]));
}
main().catch(console.error);
