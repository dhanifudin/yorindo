const xlsx = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/handr/OneDrive/Desktop/Capstone/Versii baru, biar bisa sekalian nyoba/yorindo/Sampel Data (26.3).xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log('Headers:', data[0]);
} catch (error) {
  console.error('Error reading the file:', error.message);
}
