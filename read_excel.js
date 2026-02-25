const x = require('xlsx');

const filepath = 'C:/Users/Usuario/Downloads/HR Sub modulo Maestro HC. Esquema de Base de Datos HOMESI.xlsx';

try {
    const wb = x.readFile(filepath);
    console.log('Sheets:', wb.SheetNames);
    wb.SheetNames.forEach(s => {
        const ws = wb.Sheets[s];
        const data = x.utils.sheet_to_json(ws, { header: 1, defval: '' });
        console.log('\n--- Sheet:', s, '---');
        data.forEach((r, i) => {
            if (r.some(v => String(v).trim())) {
                console.log(`ROW${i}: ` + r.map(v => String(v)).join(' | '));
            }
        });
    });
} catch (e) {
    console.log('ERROR:', e.message);
}
