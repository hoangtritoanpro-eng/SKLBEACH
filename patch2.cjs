const fs = require('fs');

let codeGs = fs.readFileSync('code.gs', 'utf8');

const getClassesRegex = /\s*if \(u\.Role === 'ADMIN'\) \{[\s\S]*?return ok\(all\);\n\}/;
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
  fs.writeFileSync('code.gs', codeGs.replace(getClassesRegex, '\n' + newGetClassesBody));
  console.log('Patched code.gs');
} else {
  console.log('Failed to patch code.gs');
}
