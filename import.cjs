const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzsmBgo6qIPnlfrgY1_DdqXMho_u5_CsaeVyFhIkDJxx1tkFk2ryg7fDZRZ4luNmoMU/exec';
const adminEmail = 'admin@example.com';

async function api(action, data) {
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, email: adminEmail, ...data })
  });
  const json = await response.json();
  if (!json.ok) throw new Error(json.error || 'Lỗi API');
  return json.data;
}

async function run() {
  try {
    const dir = 'c:/Users/hoang/Downloads/TOAN/SKLBEACH';
    const files = fs.readdirSync(dir).filter(f => f.startsWith('danh_sach_hoc_sinh_') && f.endsWith('.xls'));
    
    // Fetch classes
    const classes = await api('getClasses', {});
    
    for (const file of files) {
      console.log('Processing', file);
      
      const wb = xlsx.readFile(path.join(dir, file));
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      
      // Parse class name from row 3 (index 3 is row 4, wait! "Lớp: 6/4_CS5 - GVCN: Dương Bảo Thi")
      // Let's check row 3 (0-indexed)
      let className = '';
      if (rows[3] && rows[3][0] && String(rows[3][0]).includes('Lớp:')) {
         const match = String(rows[3][0]).match(/Lớp:\s*(.+?)\s*-/);
         if (match) className = match[1].trim();
      }
      
      if (!className) {
          // fallback to filename
          className = file.replace('danh_sach_hoc_sinh_', '').replace('.xls', '').toUpperCase();
          const parts = className.split('_'); // ['6', '4', 'CS5']
          if (parts.length >= 3) {
            className = parts[0] + '/' + parts[1] + '_' + parts.slice(2).join('_');
          }
      }
      
      console.log('Detected class name:', className);
      
      const studentsToImport = [];
      for (let i = 7; i < rows.length; i++) {
        const row = rows[i] || [];
        const stt = parseInt(row[0], 10);
        if (isNaN(stt)) continue;
        
        const studentCode = String(row[1] || '').trim();
        const fullName = String(row[3] || '').trim();
        
        if (fullName) {
          studentsToImport.push({
            studentId: studentCode,
            fullName: fullName,
            parentPhone: '',
            parentName: '',
            parentEmail: '',
            note: ''
          });
        }
      }
      
      console.log(`Found ${studentsToImport.length} students in ${className}`);
      
      let cls = classes.find(c => c.ClassName === className);
      let classId;
      if (cls) {
        classId = cls.ClassID;
      } else {
        const res = await api('addClass', { className: className, status: 'ACTIVE' });
        // Fetch classes again to get the ID because the old backend might not return classId
        const newClasses = await api('getClasses', {});
        const newCls = newClasses.find(c => c.ClassName === className);
        classId = newCls ? newCls.ClassID : undefined;
        if (!classId) throw new Error('Could not get classId after creation');
        classes.push({ ClassID: classId, ClassName: className });
        console.log('Created class', classId);
      }
      
      console.log(`Importing to class ${classId}...`);
      await api('importClassRoster', { classId: classId, students: studentsToImport });
      console.log(`Done importing for ${className}`);
    }
  } catch(e) {
    console.error(e);
  }
}
run();
