import zipfile, xml.etree.ElementTree as ET, json
z = zipfile.ZipFile(r'C:\Users\handr\OneDrive\Desktop\Capstone\Versii baru, biar bisa sekalian nyoba\yorindo\Sampel Data (26.3).xlsx')

# read shared strings
root = ET.fromstring(z.read('xl/sharedStrings.xml'))
strings = [t.text for t in root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t')]

# read sheet1
sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
rows = sheet.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')

headers = []
for c in rows[0].findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
    val = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
    if val is not None:
        idx = int(val.text)
        if c.attrib.get('t') == 's':
            headers.append(strings[idx])
        else:
            headers.append(val.text)

print(json.dumps(headers, indent=2))
