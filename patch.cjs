const fs = require('fs');

let codeGs = fs.readFileSync('code.gs', 'utf8');

const getClassesRegex = /  if \(u\.Role === 'ADMIN'\) \{[\s\S]*?return ok\(all\);\n\}/;
const newGetClassesBody = `  if (u.Role === 'ADMIN') {
    // Admin only sees center classes (CLS)
    all = all.filter(function(c) {
      return String(c.ClassID).indexOf('PRI') !== 0;
    });
  } else {
    // Teacher / TA
    var assigned = sheetToObjects(getSheet(SHEET.TCH_CLASSES))
      .filter(function(x){ return x.TeacherEmail === email; })
      .map(function(x){ return x.ClassID; });
      
    if (body.centerClassesOnly || body.allClasses) {
      // Violations, Points, Join Class: ONLY see ALL Center classes (Admin's classes)
      all = all.filter(function(c) {
        return String(c.ClassID).indexOf('PRI') !== 0;
      });
    } else {
      // DEFAULT (Classes, Scores, Lessons, Attendance): only see assigned classes
      all = all.filter(function(c){ return assigned.includes(c.ClassID); });
    }
  }

  return ok(all);
}`;

if (getClassesRegex.test(codeGs)) {
  fs.writeFileSync('code.gs', codeGs.replace(getClassesRegex, newGetClassesBody));
  console.log('Patched code.gs');
} else {
  console.log('Failed to patch code.gs');
}

['src/pages/Violations.jsx', 'src/pages/Points.jsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/api\('getClasses', \{\}, user\.email\)/g, "api('getClasses', { centerClassesOnly: true }, user.email)");
  fs.writeFileSync(file, content);
  console.log('Patched ' + file);
});

let classesJsx = fs.readFileSync('src/pages/Classes.jsx', 'utf8');
classesJsx = classesJsx.replace(/api\('getClasses', \{ allClasses: true \}, user\.email\)/g, "api('getClasses', { centerClassesOnly: true }, user.email)");
classesJsx = classesJsx.replace(/api\('getClasses', \{ myClassesOnly: true \}, user\.email\)/g, "api('getClasses', {}, user.email)");
fs.writeFileSync('src/pages/Classes.jsx', classesJsx);
console.log('Patched Classes.jsx');
