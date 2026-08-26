// ============================================================
//  QUẢN LÝ TRUNG TÂM – code.gs
//  Google Apps Script Backend
//  Deploy: "Execute as: Me" | "Who has access: Anyone"
// ============================================================

function forceAuth() {
  DriveApp.createFile('dummy', 'dummy');
}

// NẾU BẠN DÙNG SCRIPT ĐỘC LẬP (Không tạo từ Google Sheet), 
// HÃY ĐIỀN ID CỦA GOOGLE SHEET VÀO ĐÂY.
// Lấy ID từ URL: https://docs.google.com/spreadsheets/d/LA-ID-CUA-SHEET/edit
var SPREADSHEET_ID = '1H9KwmcUwE7gmPeaKeJQxW4SZ9sElnTm036Y-03GydDc'; 

// ── Tên các sheet ──────────────────────────────────────────
var SHEET = {
  USERS:        'Users',
  CLASSES:      'Classes',
  STUDENTS:     'Students',
  ENROLLMENTS:  'Enrollments',
  ATTENDANCE:   'Attendance',
  SCORES:       'Scores',
  TCH_CLASSES:  'TeacherClasses',
  LESSONS:      'Lessons',
  VIOLATIONS:   'Violations',
  POINTS:       'Points',
  NOTICES:      'Notices',
  LIBRARY:      'Library',
  PPCT:         'PPCT',
  QUESTION_BANK:'QuestionBank',
  EXAMS:        'Exams',
  CLASS_REPORTS:'ClassReports',
};

// ── Cột của từng sheet (theo thứ tự, 0-indexed) ────────────
var COL = {
  USERS:        ['Email','Name','Role','Pin','Active'],
  CLASSES:      ['ClassID','ClassName','Subject','Grade','StartDate','Status','GVCN_Email'],
  STUDENTS:     ['StudentID','FullName','ParentName','ParentPhone','ParentEmail','Note','Status'],
  ENROLLMENTS:  ['StudentID','ClassID','EnrollDate','Status'],
  ATTENDANCE:   ['Date','ClassID','StudentID','Present','Note','By'],
  SCORES:       ['Date','ClassID','ExamName','MaxScore','StudentID','Score','Note','By'],
  TCH_CLASSES:  ['TeacherEmail','ClassID'],
  LESSONS:      ['LessonID','Date','ClassID','TeacherEmail','Topic','Content','Homework'],
  VIOLATIONS:   ['ViolationID','Date','StudentID','ClassID','Reason','Severity','ActionTaken','Reporter'],
  POINTS:       ['PointID','Date','StudentID','ClassID','PointsAdded','Reason','TeacherEmail'],
  NOTICES:      ['NoticeID','Date','Title','Content','TargetAudience','Author'],
  LIBRARY:      ['DocID','Date','Title','Category','FileUrl','Description','UploadedBy'],
  PPCT:         ['ID','Tuan','Chuong','Bai','YeuCauCanDat'],
  QUESTION_BANK:['QID','PPCT_ID','Level','Type','Content','Options','CorrectAnswer','Rubric'],
  EXAMS:        ['ExamID','Name','MatrixConfig','GeneratedQuestions','CreatedAt'],
  CLASS_REPORTS:['ReportID','Date','ClassID','TeacherEmail','Type','Content','AudioUrl','Status','ApprovedBy'],
};

// ────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────
function ss() { 
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('Lỗi: Không tìm thấy Google Sheet. Vui lòng điền SPREADSHEET_ID ở dòng 9.');
  }
  return active;
}

function getSheet(name) {
  var sheet = ss().getSheetByName(name);
  var cols = COL[Object.keys(SHEET).find(function(k) { return SHEET[k] === name; })];
  if (!sheet) {
    sheet = ss().insertSheet(name);
    if (cols) sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
  } else if (cols) {
    var lastCol = sheet.getLastColumn();
    if (lastCol < cols.length) {
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]);
    }
  }
  return sheet;
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var expectedCols = COL[Object.keys(SHEET).find(function(k) { return SHEET[k] === sheet.getName(); })];
  var finalHeaders = expectedCols || headers;

  return data.slice(1).map(function(row) {
    var obj = {};
    finalHeaders.forEach(function(h, i) {
      obj[h] = (row[i] === null || row[i] === undefined) ? '' : String(row[i]);
    });
    return obj;
  });
}

function ok(data)  { return ContentService.createTextOutput(JSON.stringify({ ok: true,  data: data  })).setMimeType(ContentService.MimeType.JSON); }
function err(msg)  { return ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg })).setMimeType(ContentService.MimeType.JSON); }

/** Generate ID like CLS001, STU012 */
function generateId(prefix, sheet) {
  var rows = sheet.getLastRow() - 1;
  var n = rows < 0 ? 0 : rows;
  return prefix + String(n + 1).padStart(3, '0');
}

function today() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// ────────────────────────────────────────────────────────────
//  AUTH CHECK
// ────────────────────────────────────────────────────────────
function requireAuth(email) {
  if (!email) throw new Error('Chưa đăng nhập');
  var users = sheetToObjects(getSheet(SHEET.USERS));
  var u = users.find(function(x){ 
    return String(x.Email).trim().toLowerCase() === String(email).trim().toLowerCase() && 
           String(x.Active).trim().toUpperCase() === 'TRUE'; 
  });
  if (!u) throw new Error('Tài khoản không tồn tại hoặc đã bị khóa');
  return u;
}

function requireRole(email, roles) {
  var u = requireAuth(email);
  if (!roles.includes(u.Role)) throw new Error('Không có quyền thực hiện thao tác này');
  return u;
}

// ────────────────────────────────────────────────────────────
//  ENTRY POINT
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
          return err('Hệ thống đang bận xử lý dữ liệu của người khác, vui lòng thử lại sau vài giây.');
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
}

// ────────────────────────────────────────────────────────────
//  LOGIN
// ────────────────────────────────────────────────────────────
function login(body) {
  var users = sheetToObjects(getSheet(SHEET.USERS));
  var u = users.find(function(x){
    return String(x.Email).trim().toLowerCase() === String(body.email).trim().toLowerCase() && 
           String(x.Pin).trim() === String(body.pin).trim() && 
           String(x.Active).trim().toUpperCase() === 'TRUE';
  });
  if (!u) return err('Email hoặc PIN không đúng');
  return ok({ email: u.Email, name: u.Name, role: u.Role });
}

// ────────────────────────────────────────────────────────────
//  CLASSES
// ────────────────────────────────────────────────────────────
function getClasses(body, email) {
  var all = sheetToObjects(getSheet(SHEET.CLASSES));
  if (body.public) {
    return ok(all.filter(function(c){ return String(c.Status).toUpperCase() !== 'INACTIVE'; }));
  }
  requireAuth(email);
  var u = requireAuth(email);

  // TẤT CẢ các role (ADMIN, TEACHER, TA) chỉ xem được lớp mà mình được phân công
  // Ngoại trừ trường hợp yêu cầu lấy tất cả lớp (allClasses = true) cho mục báo cáo vi phạm, tích điểm
  if (u.Role === 'ADMIN') {
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
}

function addClass(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.CLASSES);
  var u = requireAuth(email);
  var prefix = (u.Role === 'TEACHER') ? 'PRI' : 'CLS';
  var id = generateId(prefix, sheet);
  
  var gvcn = body.gvcnEmail || '';
  if (u.Role === 'TEACHER' && !gvcn) {
    gvcn = email;
  }

  var arr = [
    id,
    body.className || '',
    body.subject   || '',
    body.grade     || '',
    body.startDate || today(),
    body.status    || 'ACTIVE',
    gvcn,
  ];
  sheet.appendRow(arr);
  
  // Gán ngay lớp này cho người tạo (dù là ADMIN hay TEACHER)
  getSheet(SHEET.TCH_CLASSES).appendRow([email, id]);
  
  return ok({ClassID: id});
}

function editClass(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.CLASSES);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.classId) {
      sheet.getRange(i+1, 2).setValue(body.className    || data[i][1]);
      sheet.getRange(i+1, 3).setValue(body.subject      || data[i][2]);
      sheet.getRange(i+1, 4).setValue(body.grade        || data[i][3]);
      sheet.getRange(i+1, 5).setValue(body.startDate    || data[i][4]);
      sheet.getRange(i+1, 6).setValue(body.status       || data[i][5]);
      sheet.getRange(i+1, 7).setValue(body.gvcnEmail    !== undefined ? body.gvcnEmail : (data[i][6] || ''));
      return ok('updated');
    }
  }
  return err('Không tìm thấy lớp ' + body.classId);
}

function deleteClass(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.CLASSES);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.classId) {
      sheet.deleteRow(i + 1);
      return ok('deleted');
    }
  }
  return err('Không tìm thấy lớp ' + body.classId);
}

// ────────────────────────────────────────────────────────────
//  STUDENTS
// ────────────────────────────────────────────────────────────
function getStudents(body, email) {
  if (body.public) {
    var all = sheetToObjects(getSheet(SHEET.STUDENTS));
    return ok(all.map(function(s) {
      return { StudentID: s.StudentID, FullName: s.FullName };
    }));
  }
  requireRole(email, ['ADMIN', 'TEACHER']);
  return ok(sheetToObjects(getSheet(SHEET.STUDENTS)));
}

function addStudent(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.STUDENTS);
  var id = generateId('STU', sheet);
  sheet.appendRow([
    id,
    body.fullName    || '',
    body.parentName  || '',
    body.parentPhone || '',
    body.parentEmail || '',
    body.note        || '',
    'ACTIVE',
  ]);
  return ok({ studentId: id });
}

function deleteStudent(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.STUDENTS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.studentId) {
      sheet.deleteRow(i + 1);
      
      // Also remove from ENROLLMENTS
      var enrollSheet = getSheet(SHEET.ENROLLMENTS);
      var enrollData = enrollSheet.getDataRange().getValues();
      for (var j = enrollData.length - 1; j > 0; j--) {
        if (String(enrollData[j][0]) === body.studentId) {
          enrollSheet.deleteRow(j + 1);
        }
      }
      
      return ok('Đã xóa học sinh');
    }
  }
  return err('Không tìm thấy học sinh');
}

function importStudents(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.STUDENTS);
  var count = 0;
  
  if (body.students && Array.isArray(body.students)) {
    body.students.forEach(function(stu) {
      if (!stu.fullName) return; // Bỏ qua nếu không có tên
      var id = generateId('STU', sheet);
      sheet.appendRow([
        id,
        stu.fullName || '',
        stu.parentName || '',
        stu.parentPhone || '',
        stu.parentEmail || '',
        stu.note || '',
        'ACTIVE'
      ]);
      count++;
    });
  }
  
  return ok({ message: 'Đã nhập ' + count + ' học sinh' });
}

function editStudent(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.STUDENTS);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.studentId) {
      sheet.getRange(i+1, 2).setValue(body.fullName    !== undefined ? body.fullName    : data[i][1]);
      sheet.getRange(i+1, 3).setValue(body.parentName  !== undefined ? body.parentName  : data[i][2]);
      sheet.getRange(i+1, 4).setValue(body.parentPhone !== undefined ? body.parentPhone : data[i][3]);
      sheet.getRange(i+1, 5).setValue(body.parentEmail !== undefined ? body.parentEmail : data[i][4]);
      sheet.getRange(i+1, 6).setValue(body.note        !== undefined ? body.note        : data[i][5]);
      sheet.getRange(i+1, 7).setValue(body.status      || data[i][6]);
      return ok('updated');
    }
  }
  return err('Không tìm thấy học sinh ' + body.studentId);
}

// ────────────────────────────────────────────────────────────
//  ENROLLMENTS
// ────────────────────────────────────────────────────────────
function getClassRoster(body, email) {
  if (!body.public) requireAuth(email);
  var enrolls  = sheetToObjects(getSheet(SHEET.ENROLLMENTS))
    .filter(function(e){ return e.ClassID === body.classId && e.Status === 'ACTIVE'; });
  var students = sheetToObjects(getSheet(SHEET.STUDENTS));
  var stuMap   = {};
  students.forEach(function(s){ stuMap[s.StudentID] = s; });
  return ok(enrolls.map(function(e){ return stuMap[e.StudentID] || { StudentID: e.StudentID, FullName: '??' }; }));
}

function enrollStudent(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet   = getSheet(SHEET.ENROLLMENTS);
  var enrolls = sheetToObjects(sheet);
  var exists  = enrolls.find(function(e){ return e.StudentID === body.studentId && e.ClassID === body.classId; });
  if (exists) {
    // Reactivate if removed
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === body.studentId && String(data[i][1]) === body.classId) {
        sheet.getRange(i+1, 4).setValue('ACTIVE');
        return ok('reactivated');
      }
    }
  }
  sheet.appendRow([ body.studentId, body.classId, today(), 'ACTIVE' ]);
  return ok('enrolled');
}

function removeEnrollment(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.ENROLLMENTS);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.studentId && String(data[i][1]) === body.classId) {
      sheet.getRange(i+1, 4).setValue('REMOVED');
      return ok('removed');
    }
  }
  return err('Không tìm thấy enrollment');
}

function importClassRoster(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var classId = body.classId;
  var studentsData = body.students;
  
  if (!studentsData || !Array.isArray(studentsData) || studentsData.length === 0) {
    return err('Dữ liệu học sinh không hợp lệ');
  }

  var studentSheet = getSheet(SHEET.STUDENTS);
  var enrollSheet = getSheet(SHEET.ENROLLMENTS);
  
  var allStudents = sheetToObjects(studentSheet);
  var allEnrolls = sheetToObjects(enrollSheet);
  
  var addedCount = 0;
  var enrolledCount = 0;
  var dateStr = today();
  
  studentsData.forEach(function(s) {
    if (!s.fullName) return;
    
    // Find existing student by Phone or Name
    var existing = allStudents.find(function(x) { 
      var phoneMatch = s.parentPhone && x.ParentPhone === String(s.parentPhone);
      var nameMatch = x.FullName && String(x.FullName).trim().toLowerCase() === String(s.fullName).trim().toLowerCase();
      var inThisClass = allEnrolls.some(function(e) { return e.StudentID === x.StudentID && e.ClassID === classId; });
      return phoneMatch || (nameMatch && inThisClass);
    });
    
    var sId;
    if (existing) {
      sId = existing.StudentID;
    } else {
      sId = s.studentId || generateId('STU', studentSheet);
      studentSheet.appendRow([
        sId,
        s.fullName || '',
        s.parentName || '',
        s.parentPhone || '',
        s.parentEmail || '',
        s.note || '',
        'ACTIVE'
      ]);
      allStudents.push({
        StudentID: sId,
        FullName: s.fullName,
        ParentPhone: s.parentPhone
      });
      addedCount++;
    }
    
    // Enroll
    var existingEnroll = allEnrolls.find(function(e) {
      return e.StudentID === sId && e.ClassID === classId;
    });
    
    if (existingEnroll) {
      if (existingEnroll.Status !== 'ACTIVE') {
        var data = enrollSheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === sId && String(data[i][1]) === classId) {
            enrollSheet.getRange(i+1, 4).setValue('ACTIVE');
            existingEnroll.Status = 'ACTIVE';
            enrolledCount++;
            break;
          }
        }
      }
    } else {
      enrollSheet.appendRow([ sId, classId, dateStr, 'ACTIVE' ]);
      allEnrolls.push({ StudentID: sId, ClassID: classId, Status: 'ACTIVE' });
      enrolledCount++;
    }
  });
  
  return ok({ message: 'Đã thêm mới ' + addedCount + ' hs, ghi danh ' + enrolledCount + ' hs vào lớp.' });
}

// ────────────────────────────────────────────────────────────
//  TEACHER–CLASS ASSIGNMENTS
// ────────────────────────────────────────────────────────────
function getTeachers(body, email) {
  requireRole(email, ['ADMIN']);
  var users = sheetToObjects(getSheet(SHEET.USERS));
  return ok(users.filter(function(u){ return u.Role === 'TEACHER' || u.Role === 'TA'; }));
}

function getClassTeachers(body, email) {
  requireAuth(email);
  var tc    = sheetToObjects(getSheet(SHEET.TCH_CLASSES))
    .filter(function(x){ return x.ClassID === body.classId; });
  var users = sheetToObjects(getSheet(SHEET.USERS));
  var uMap  = {};
  users.forEach(function(u){ uMap[u.Email] = u; });
  return ok(tc.map(function(x){ return uMap[x.TeacherEmail] || { Email: x.TeacherEmail, Name: '??', Role: '??' }; }));
}

function assignTeacher(body, email) {
  var u = requireAuth(email);
  if (u.Role !== 'ADMIN') {
    if (body.teacherEmail !== email) {
      return err('Bạn chỉ có thể tự thêm lớp cho chính mình');
    }
  }
  var sheet = getSheet(SHEET.TCH_CLASSES);
  var rows  = sheetToObjects(sheet);
  var exists = rows.find(function(r){ return r.TeacherEmail === body.teacherEmail && r.ClassID === body.classId; });
  if (exists) return err('Đã phân công rồi');
  sheet.appendRow([ body.teacherEmail, body.classId ]);
  return ok('assigned');
}

function removeTeacherFromClass(body, email) {
  requireRole(email, ['ADMIN']);
  var sheet = getSheet(SHEET.TCH_CLASSES);
  var data  = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === body.teacherEmail && String(data[i][1]) === body.classId) {
      sheet.deleteRow(i + 1);
      return ok('removed');
    }
  }
  return err('Không tìm thấy phân công');
}

// ────────────────────────────────────────────────────────────
//  ATTENDANCE
// ────────────────────────────────────────────────────────────
function markAttendance(body, email) {
  requireAuth(email);
  // body.records = [{ studentId, present, note }]
  var sheet = getSheet(SHEET.ATTENDANCE);
  var data  = sheet.getDataRange().getValues();
  var date  = body.date || today();

  body.records.forEach(function(rec) {
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === date &&
          String(data[i][1]) === body.classId &&
          String(data[i][2]) === rec.studentId) {
        sheet.getRange(i+1, 4).setValue(rec.present ? 'TRUE' : 'FALSE');
        sheet.getRange(i+1, 5).setValue(rec.note || '');
        sheet.getRange(i+1, 6).setValue(email);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([ date, body.classId, rec.studentId, rec.present ? 'TRUE' : 'FALSE', rec.note || '', email ]);
      data.push([ date, body.classId, rec.studentId, rec.present ? 'TRUE' : 'FALSE', rec.note || '', email ]);
    }
  });
  return ok('saved');
}

function getAttendance(body, email) {
  requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.ATTENDANCE));
  var result = all.filter(function(r){
    var match = r.ClassID === body.classId;
    if (body.date)      match = match && r.Date === body.date;
    if (body.studentId) match = match && r.StudentID === body.studentId;
    return match;
  });
  return ok(result);
}

// ────────────────────────────────────────────────────────────
//  SCORES
// ────────────────────────────────────────────────────────────
function addScores(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.SCORES);
  var data  = sheet.getDataRange().getValues();
  var date  = body.date || today();

  (body.records || []).forEach(function(rec) {
    var found = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === body.classId &&
          String(data[i][2]) === body.examName &&
          String(data[i][4]) === rec.studentId) {
        sheet.getRange(i+1, 1).setValue(date);
        sheet.getRange(i+1, 4).setValue(body.maxScore);
        sheet.getRange(i+1, 6).setValue(rec.score);
        sheet.getRange(i+1, 7).setValue(rec.note || '');
        sheet.getRange(i+1, 8).setValue(email);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([ date, body.classId, body.examName, body.maxScore, rec.studentId, rec.score, rec.note || '', email ]);
      data.push([ date, body.classId, body.examName, body.maxScore, rec.studentId, rec.score, rec.note || '', email ]);
    }
  });
  return ok('saved');
}

function getScores(body, email) {
  requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.SCORES));
  var result = all.filter(function(r){
    var match = r.ClassID === body.classId;
    if (body.examName)  match = match && r.ExamName === body.examName;
    if (body.studentId) match = match && r.StudentID === body.studentId;
    return match;
  });
  return ok(result);
}

// ────────────────────────────────────────────────────────────
//  USERS
// ────────────────────────────────────────────────────────────
function getUsers(body, email) {
  requireRole(email, ['ADMIN']);
  return ok(sheetToObjects(getSheet(SHEET.USERS)));
}

function addUser(body, email) {
  requireRole(email, ['ADMIN']);
  var sheet = getSheet(SHEET.USERS);
  var users = sheetToObjects(sheet);
  if (users.find(function(u){ return u.Email === body.targetEmail; }))
    return err('Email đã tồn tại');
  sheet.appendRow([ body.targetEmail, body.name, body.role, body.pin || '1234', body.active || 'TRUE' ]);
  return ok('added');
}

function editUser(body, email) {
  requireRole(email, ['ADMIN']);
  var sheet = getSheet(SHEET.USERS);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === body.targetEmail) {
      sheet.getRange(i+1, 2).setValue(body.name   !== undefined ? body.name   : data[i][1]);
      sheet.getRange(i+1, 3).setValue(body.role   !== undefined ? body.role   : data[i][2]);
      sheet.getRange(i+1, 4).setValue(body.pin    !== undefined ? body.pin    : data[i][3]);
      sheet.getRange(i+1, 5).setValue(body.active !== undefined ? body.active : data[i][4]);
      return ok('updated');
    }
  }
  return err('Không tìm thấy user ' + body.targetEmail);
}

// ────────────────────────────────────────────────────────────
//  DASHBOARD
// ────────────────────────────────────────────────────────────
function getDashboard(body, email) {
  requireRole(email, ['ADMIN']);
  var users      = sheetToObjects(getSheet(SHEET.USERS));
  var classes    = sheetToObjects(getSheet(SHEET.CLASSES));
  var students   = sheetToObjects(getSheet(SHEET.STUDENTS));
  var att        = sheetToObjects(getSheet(SHEET.ATTENDANCE));
  var violations = sheetToObjects(getSheet(SHEET.VIOLATIONS));
  var points     = sheetToObjects(getSheet(SHEET.POINTS));
  var todayStr   = today();

  var attToday  = att.filter(function(a){ return a.Date === todayStr; });
  var presentToday = attToday.filter(function(a){ return a.Present === 'TRUE'; }).length;

  return ok({
    totalStudents:  students.filter(function(s){ return s.Status === 'ACTIVE'; }).length,
    totalClasses:   classes.filter(function(c){ return c.Status === 'ACTIVE'; }).length,
    totalTeachers:  users.filter(function(u){ return u.Role === 'TEACHER' && u.Active === 'TRUE'; }).length,
    totalTAs:       users.filter(function(u){ return u.Role === 'TA'      && u.Active === 'TRUE'; }).length,
    presentToday:   presentToday,
    totalAttToday:  attToday.length,
    violations:     violations,
    points:         points,
    classes:        classes.map(function(c) { return { ClassID: c.ClassID, ClassName: c.ClassName }; }),
    students:       students.map(function(s) { return { StudentID: s.StudentID, FullName: s.FullName }; }),
  });
}

// ────────────────────────────────────────────────────────────
//  PARENT REPORT (PUBLIC — no auth)
// ────────────────────────────────────────────────────────────
function getStudentReport(body) {
  var studentId = body.studentId;
  var students  = sheetToObjects(getSheet(SHEET.STUDENTS));
  var student   = students.find(function(s){ return s.StudentID === studentId; });
  if (!student) return err('Không tìm thấy học sinh');

  var enrolls = sheetToObjects(getSheet(SHEET.ENROLLMENTS))
    .filter(function(e){ return e.StudentID === studentId && e.Status === 'ACTIVE'; });
  var classes  = sheetToObjects(getSheet(SHEET.CLASSES));
  var clsMap   = {};
  classes.forEach(function(c){ clsMap[c.ClassID] = c; });

  var allAtt    = sheetToObjects(getSheet(SHEET.ATTENDANCE));
  var allScores = sheetToObjects(getSheet(SHEET.SCORES));
  var allReports = sheetToObjects(getSheet(SHEET.CLASS_REPORTS)).filter(function(r){ return r.Status === 'APPROVED'; });

  var classData = enrolls.map(function(enr) {
    var cid = enr.ClassID;
    var cls = clsMap[cid] || {};
    var stuAtt = allAtt.filter(function(a){ return a.ClassID === cid && a.StudentID === studentId; });
    // Total sessions = distinct dates in attendance for this class
    var dates  = {};
    allAtt.filter(function(a){ return a.ClassID === cid; }).forEach(function(a){ dates[a.Date] = true; });
    var sessionsTotal    = Object.keys(dates).length;
    var sessionsAttended = stuAtt.filter(function(a){ return a.Present === 'TRUE'; }).length;

    var scores = allScores.filter(function(s){ return s.ClassID === cid && s.StudentID === studentId; });
    var reports = allReports.filter(function(r){ return r.ClassID === cid; });

    return {
      classId:          cid,
      className:        cls.ClassName || cid,
      subject:          cls.Subject   || '',
      grade:            cls.Grade     || '',
      sessionsTotal:    sessionsTotal,
      sessionsAttended: sessionsAttended,
      scores:           scores,
      attendance:       stuAtt.sort(function(a,b){ return b.Date.localeCompare(a.Date); }),
      reports:          reports.sort(function(a,b){ return b.Date.localeCompare(a.Date); }),
    };
  });

  return ok({ student: student, classes: classData });
}

// ────────────────────────────────────────────────────────────
//  NEW FEATURES (LESSONS, VIOLATIONS, POINTS, NOTICES, LIBRARY)
// ────────────────────────────────────────────────────────────
function getLessons(body, email) {
  if (!body.public) requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.LESSONS));
  if (body.classId) all = all.filter(function(r){ return r.ClassID === body.classId; });
  return ok(all.sort(function(a,b){ return b.Date.localeCompare(a.Date); }));
}

function addLesson(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.LESSONS);
  var id = generateId('LSN', sheet);
  sheet.appendRow([ id, body.date || today(), body.classId, email, body.topic || '', body.content || '', body.homework || '' ]);
  return ok({ lessonId: id });
}

function getViolations(body, email) {
  if (!body.public) requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.VIOLATIONS));
  if (body.studentId) all = all.filter(function(r){ return r.StudentID === body.studentId; });
  if (body.classId) all = all.filter(function(r){ return r.ClassID === body.classId; });
  return ok(all.sort(function(a,b){ return b.Date.localeCompare(a.Date); }));
}

function addViolation(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.VIOLATIONS);
  var id = generateId('VIO', sheet);
  sheet.appendRow([ id, body.date || today(), body.studentId, body.classId || '', body.reason || '', body.severity || 'Minor', body.actionTaken || '', email ]);
  return ok({ violationId: id });
}

function getPoints(body, email) {
  if (!body.public) requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.POINTS));
  if (body.studentId) all = all.filter(function(r){ return r.StudentID === body.studentId; });
  if (body.classId) all = all.filter(function(r){ return r.ClassID === body.classId; });
  return ok(all.sort(function(a,b){ return b.Date.localeCompare(a.Date); }));
}

function addPoints(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.POINTS);
  var id = generateId('PNT', sheet);
  sheet.appendRow([ id, body.date || today(), body.studentId, body.classId || '', body.pointsAdded || 0, body.reason || '', email ]);
  return ok({ pointId: id });
}

function getNotices(body, email) {
  if (!body.public) requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.NOTICES));
  return ok(all.sort(function(a,b){ return b.Date.localeCompare(a.Date); }));
}

function addNotice(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.NOTICES);
  var id = generateId('NOT', sheet);
  sheet.appendRow([ id, body.date || today(), body.title || '', body.content || '', body.targetAudience || 'All', email ]);
  return ok({ noticeId: id });
}

function deleteNotice(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.NOTICES);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.noticeId) {
      sheet.deleteRow(i + 1);
      return ok({message: 'Đã xóa thông báo'});
    }
  }
  return err('Không tìm thấy thông báo');
}

function getLibrary(body, email) {
  if (!body.public) requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.LIBRARY));
  return ok(all.sort(function(a,b){ return b.Date.localeCompare(a.Date); }));
}

function addLibraryItem(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.LIBRARY);
  var id = generateId('LIB', sheet);
  sheet.appendRow([ id, body.date || today(), body.title || '', body.category || '', body.fileUrl || '', body.description || '', email ]);
  return ok({ docId: id });
}

// ────────────────────────────────────────────────────────────
//  CLASS REPORTS (Báo cáo của GVBM)
// ────────────────────────────────────────────────────────────
function getClassReports(body, email) {
  requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.CLASS_REPORTS));
  
  if (body.status) {
    all = all.filter(function(r) { return r.Status === body.status; });
  }
  
  // Lấy danh sách lớp học
  var classes = sheetToObjects(getSheet(SHEET.CLASSES));
  
  // Nếu là ADMIN thì thấy hết
  // Nếu là GVCN của lớp nào thì thấy toàn bộ báo cáo của lớp đó
  // Nếu là GVBM (không phải GVCN của lớp đó) thì chỉ thấy báo cáo do chính mình gửi
  var u = requireAuth(email);
  if (u.Role !== 'ADMIN') {
    all = all.filter(function(r) { 
      var cls = classes.find(function(c) { return c.ClassID === r.ClassID; });
      var isGVCN = cls && cls.GVCN_Email === email;
      var isMyOwnReport = r.TeacherEmail === email;
      return isGVCN || isMyOwnReport;
    });
  }
  
  if (body.classId) {
    all = all.filter(function(r){ return r.ClassID === body.classId; });
  }

  // Lấy thêm thông tin tên lớp và tên giáo viên
  var users = sheetToObjects(getSheet(SHEET.USERS));
  var clsMap = {}; classes.forEach(function(c){ clsMap[c.ClassID] = c.ClassName; });
  var usrMap = {}; users.forEach(function(u){ usrMap[u.Email] = u.Name; });
  
  var result = all.map(function(r) {
    return {
      ReportID: r.ReportID,
      Date: r.Date,
      ClassID: r.ClassID,
      ClassName: clsMap[r.ClassID] || r.ClassID,
      TeacherEmail: r.TeacherEmail,
      TeacherName: usrMap[r.TeacherEmail] || r.TeacherEmail,
      Type: r.Type,
      Content: r.Content,
      AudioUrl: r.AudioUrl,
      Status: r.Status,
      ApprovedBy: r.ApprovedBy
    };
  });

  return ok(result.sort(function(a,b){ return b.Date.localeCompare(a.Date); }));
}

function addClassReport(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.CLASS_REPORTS);
  var id = generateId('REP', sheet);
  sheet.appendRow([
    id,
    body.date || today(),
    body.classId,
    email,
    body.type || 'THÔNG BÁO',
    body.content || '',
    body.audioUrl || '',
    'PENDING',
    ''
  ]);
  return ok({ reportId: id });
}

function updateClassReportStatus(body, email) {
  var u = requireAuth(email);
  var sheet = getSheet(SHEET.CLASS_REPORTS);
  var data = sheet.getDataRange().getValues();
  
  var classSheet = getSheet(SHEET.CLASSES);
  var classData = classSheet.getDataRange().getValues();
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.reportId) {
      var rClassId = data[i][2]; // Cột ClassID
      
      // Check quyền GVCN
      if (u.Role !== 'ADMIN') {
        var isGVCN = false;
        for (var j = 1; j < classData.length; j++) {
          if (classData[j][0] === rClassId && classData[j][6] === email) { // Cột GVCN_Email
            isGVCN = true;
            break;
          }
        }
        if (!isGVCN) return err('Bạn không phải GVCN của lớp này, không có quyền duyệt báo cáo.');
      }
      
      sheet.getRange(i + 1, 8).setValue(body.status); // Status
      if (body.status === 'APPROVED') {
        sheet.getRange(i + 1, 9).setValue(email); // ApprovedBy
      }
      return ok({ message: 'Đã cập nhật trạng thái báo cáo' });
    }
  }
  return err('Không tìm thấy báo cáo');
}

// ────────────────────────────────────────────────────────────
//  SETUP HELPER – chạy 1 lần để tạo sheet mẫu
// ────────────────────────────────────────────────────────────
function setupSheets() {
  Object.values(SHEET).forEach(function(name) {
    getSheet(name); // creates sheet + header row if missing
  });

  // Seed admin account
  var userSheet = getSheet(SHEET.USERS);
  if (userSheet.getLastRow() < 2) {
    userSheet.appendRow(['admin@example.com', 'Admin System', 'ADMIN', '1234', 'TRUE']);
    userSheet.appendRow(['teacher@example.com', 'Giáo viên Demo', 'TEACHER', '1234', 'TRUE']);
  }

  // Seed Class
  var classSheet = getSheet(SHEET.CLASSES);
  if (classSheet.getLastRow() < 2) {
    classSheet.appendRow(['CLS001', 'Lớp Toán 10A', 'Toán', '10', today(), 'ACTIVE']);
    classSheet.appendRow(['CLS002', 'Lớp Lý 11B', 'Vật lý', '11', today(), 'ACTIVE']);
  }

  // Seed Student
  var studentSheet = getSheet(SHEET.STUDENTS);
  if (studentSheet.getLastRow() < 2) {
    studentSheet.appendRow(['STU001', 'Nguyễn Văn A', 'Nguyễn Văn B (Bố)', '0901234567', 'phuhuynh@example.com', 'Học khá', 'ACTIVE']);
    studentSheet.appendRow(['STU002', 'Trần Thị C', 'Trần Văn D (Bố)', '0987654321', 'phuhuynh2@example.com', 'Cần kèm thêm', 'ACTIVE']);
  }

  // Seed Enrollment
  var enrollSheet = getSheet(SHEET.ENROLLMENTS);
  if (enrollSheet.getLastRow() < 2) {
    enrollSheet.appendRow(['STU001', 'CLS001', today(), 'ACTIVE']);
    enrollSheet.appendRow(['STU002', 'CLS001', today(), 'ACTIVE']);
    enrollSheet.appendRow(['STU001', 'CLS002', today(), 'ACTIVE']);
  }
  
  // Seed Teacher Assignment
  var tchClassSheet = getSheet(SHEET.TCH_CLASSES);
  if (tchClassSheet.getLastRow() < 2) {
    tchClassSheet.appendRow(['teacher@example.com', 'CLS001']);
  }

  // Seed Notice
  var noticeSheet = getSheet(SHEET.NOTICES);
  if (noticeSheet.getLastRow() < 2) {
    noticeSheet.appendRow(['NOT001', today(), 'Chào mừng năm học mới', 'Trung tâm xin thông báo lịch học bắt đầu từ tuần này...', 'All', 'admin@example.com']);
  }

  // Seed Library
  var libSheet = getSheet(SHEET.LIBRARY);
  if (libSheet.getLastRow() < 2) {
    libSheet.appendRow(['LIB001', today(), 'Đề thi thử Toán 10', 'Đề thi thử', 'https://google.com', 'Đề tham khảo', 'admin@example.com']);
  }

  SpreadsheetApp.getUi().alert('✅ Đã cấu hình và tạo dữ liệu mẫu thành công!\n\nTài khoản mặc định:\n- Admin: admin@example.com | PIN: 1234\n- Giáo viên: teacher@example.com | PIN: 1234');
}

// ────────────────────────────────────────────────────────────
//  UPLOAD FILE TO DRIVE
// ────────────────────────────────────────────────────────────
var FOLDER_ID = '1xX_9G3nj_hd_9XmYYRslQIFjv-vWZXdt'; // Thay ID thư mục của bạn vào đây

function uploadFileToDrive(base64Data, fileName, mimeType) {
  try {
    // Loại bỏ prefix data:image/...;base64, nếu có
    var dataParts = base64Data.split(',');
    var base64Str = dataParts.length > 1 ? dataParts[1] : dataParts[0];

    var decoded = Utilities.base64Decode(base64Str);
    var blob = Utilities.newBlob(decoded, mimeType, fileName);
    
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var file = folder.createFile(blob);
    
    // Set quyền truy cập
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    throw new Error('Lỗi upload file: ' + e.toString());
  }
}

function handleUploadFile(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var url = uploadFileToDrive(body.base64Data, body.fileName, body.mimeType);
  return ok({ fileUrl: url });
}

function deleteUser(body, email) {
  var u = requireAuth(email);
  if (u.Role !== 'ADMIN') return err('Không có quyền');
  if (!body.deleteEmail) return err('Thiếu email cần xóa');
  if (body.deleteEmail === email) return err('Không thể xóa tài khoản của chính mình');

  var sheet = getSheet(SHEET.USERS);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === body.deleteEmail) { // Email is column 0
      sheet.deleteRow(i + 1);
      return ok({message: 'Đã xóa'});
    }
  }
  return err('Không tìm thấy người dùng');
}

// ────────────────────────────────────────────────────────────
//  EXAM BUILDER (SINH ĐỀ THI)
// ────────────────────────────────────────────────────────────
function getPPCT(body, email) {
  if (!body.public) requireAuth(email);
  var all = sheetToObjects(getSheet(SHEET.PPCT));
  var start = parseInt(body.startWeek) || 1;
  var end   = parseInt(body.endWeek) || 35;
  var result = all.filter(function(r){ 
    var w = parseInt(r.Tuan);
    return w >= start && w <= end; 
  });
  return ok(result);
}

function getQuestionsByMatrix(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var matrix = body.matrixConfig; // Array of { ppctId, level, type, count }
  var allQuestions = sheetToObjects(getSheet(SHEET.QUESTION_BANK));
  var selected = [];
  
  if (matrix && Array.isArray(matrix)) {
    matrix.forEach(function(req) {
      // Filter questions matching criteria
      var pool = allQuestions.filter(function(q) {
        return q.PPCT_ID === req.ppctId && 
               q.Level === req.level && 
               q.Type === req.type;
      });
      // Shuffle array
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = pool[i];
        pool[i] = pool[j];
        pool[j] = temp;
      }
      // Take requested count
      selected = selected.concat(pool.slice(0, req.count));
    });
  }
  return ok(selected);
}

function saveExam(body, email) {
  requireRole(email, ['ADMIN', 'TEACHER']);
  var sheet = getSheet(SHEET.EXAMS);
  var id = generateId('EXM', sheet);
  var matrixStr = JSON.stringify(body.matrixConfig || []);
  var qListStr = JSON.stringify(body.generatedQuestions || []);
  
  sheet.appendRow([ id, body.name || 'Đề thi mới', matrixStr, qListStr, today() ]);
  return ok({ examId: id });
}

function getPublicDashboard(body, email) {
  var classes = sheetToObjects(getSheet(SHEET.CLASSES)).filter(function(c){ return String(c.Status).toUpperCase() !== 'INACTIVE'; });
  var notices = sheetToObjects(getSheet(SHEET.NOTICES));
  var library = sheetToObjects(getSheet(SHEET.LIBRARY));
  var points = sheetToObjects(getSheet(SHEET.POINTS));
  var violations = sheetToObjects(getSheet(SHEET.VIOLATIONS));
  var students = sheetToObjects(getSheet(SHEET.STUDENTS)).map(function(s) {
    return { StudentID: s.StudentID, FullName: s.FullName };
  });

  return ok({
    classes: classes,
    notices: notices,
    library: library,
    points: points,
    violations: violations,
    students: students
  });
}
