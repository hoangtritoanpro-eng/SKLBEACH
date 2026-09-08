const fs = require('fs');
let codeGs = fs.readFileSync('code.gs', 'utf8');

const oldDoPostRegex = /\/\/  ENTRY POINT[\s\S]*?function doPost\(e\) \{[\s\S]*?switch \(action\) \{[\s\S]*?default: return err\('Action không hợp lệ: ' \+ action\);\n    \}\n  \} catch\(ex\) \{\n    return err\(ex\.message \|\| String\(ex\)\);\n  \}\n\}/;

const newDoPost = `//  ENTRY POINT
// ────────────────────────────────────────────────────────────
function handleAction(action, body, email) {
  switch (action) {
    // ── Auth ──────────────────────────────────
    case 'login':           return login(body);

    // ── Classes ───────────────────────────────
    case 'getClasses':      return getClasses(body, email);
    case 'addClass':        return addClass(body, email);
    case 'editClass':       return editClass(body, email);
    case 'deleteClass':     return deleteClass(body, email);

    // ── Students ──────────────────────────────
    case 'getStudents':     return getStudents(body, email);
    case 'addStudent':      return addStudent(body, email);
    case 'editStudent':     return editStudent(body, email);
    case 'importStudents':  return importStudents(body, email);

    // ── Enrollments ───────────────────────────
    case 'getClassRoster':  return getClassRoster(body, email);
    case 'enrollStudent':   return enrollStudent(body, email);
    case 'removeEnrollment':return removeEnrollment(body, email);
    case 'importClassRoster': return importClassRoster(body, email);
    case 'deleteStudent':   return deleteStudent(body, email);

    // ── Teachers ──────────────────────────────
    case 'getClassTeachers':  return getClassTeachers(body, email);
    case 'assignTeacher':     return assignTeacher(body, email);
    case 'removeTeacherFromClass': return removeTeacherFromClass(body, email);
    case 'getTeachers':       return getTeachers(body, email);

    // ── Attendance ────────────────────────────
    case 'markAttendance':  return markAttendance(body, email);
    case 'getAttendance':   return getAttendance(body, email);

    // ── Scores ────────────────────────────────
    case 'addScores':       return addScores(body, email);
    case 'getScores':       return getScores(body, email);

    // ── Users ─────────────────────────────────
    case 'getUsers':        return getUsers(body, email);
    case 'addUser':         return addUser(body, email);
    case 'editUser':        return editUser(body, email);
    case 'deleteUser':      return deleteUser(body, email);

    // ── Dashboard ──────────────────────────────
    case 'getDashboard':    return getDashboard(body, email);

    // ── Lessons ───────────────────────────────
    case 'getLessons':      return getLessons(body, email);
    case 'addLesson':       return addLesson(body, email);

    // ── Violations ────────────────────────────
    case 'getViolations':   return getViolations(body, email);
    case 'addViolation':    return addViolation(body, email);

    // ── Points ────────────────────────────────
    case 'getPoints':       return getPoints(body, email);
    case 'addPoints':       return addPoints(body, email);

    // ── Notices ───────────────────────────────
    case 'getNotices':      return getNotices(body, email);
    case 'addNotice':       return addNotice(body, email);
    case 'deleteNotice':    return deleteNotice(body, email);

    // ── Library ───────────────────────────────
    case 'getLibrary':      return getLibrary(body, email);
    case 'addLibraryItem':  return addLibraryItem(body, email);
    case 'uploadFile':      return handleUploadFile(body, email);

    // ── Exams (Exam Builder) ──────────────────
    case 'getPPCT':         return getPPCT(body, email);
    case 'getQuestionsByMatrix': return getQuestionsByMatrix(body, email);
    case 'saveExam':        return saveExam(body, email);

    // ── Class Reports ─────────────────────────
    case 'getClassReports': return getClassReports(body, email);
    case 'addClassReport':  return addClassReport(body, email);
    case 'updateClassReportStatus': return updateClassReportStatus(body, email);

    default: return err('Action không hợp lệ: ' + action);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var email  = body.email || '';

    // Public actions (no auth needed)
    if (action === 'getStudentReport') return getStudentReport(body);
    if (action === 'getPublicDashboard') return getPublicDashboard(body, email);

    var writeActions = [
      'addClass', 'editClass', 'deleteClass',
      'addStudent', 'editStudent', 'importStudents', 'deleteStudent',
      'enrollStudent', 'removeEnrollment', 'importClassRoster',
      'assignTeacher', 'removeTeacherFromClass',
      'markAttendance', 'addScores',
      'addUser', 'editUser', 'deleteUser',
      'addLesson', 'addViolation', 'addPoints',
      'addNotice', 'deleteNotice',
      'addLibraryItem', 'uploadFile',
      'saveExam', 'addClassReport', 'updateClassReportStatus'
    ];

    if (writeActions.indexOf(action) !== -1) {
      var lock = LockService.getScriptLock();
      try {
        if (!lock.tryLock(30000)) {
          return err('Hệ thống đang xử lý dữ liệu, vui lòng thử lại sau vài giây.');
        }
        return handleAction(action, body, email);
      } finally {
        lock.releaseLock();
      }
    } else {
      return handleAction(action, body, email);
    }
  } catch(ex) {
    return err(ex.message || String(ex));
  }
}`;

if (oldDoPostRegex.test(codeGs)) {
  fs.writeFileSync('code.gs', codeGs.replace(oldDoPostRegex, newDoPost));
  console.log('Successfully refactored code.gs');
} else {
  console.log('Failed to match regex for code.gs');
}
