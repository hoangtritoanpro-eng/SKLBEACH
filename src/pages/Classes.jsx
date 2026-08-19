import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, fmtCurrency, fmtDate } from '../api';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const EMPTY_FORM = { className: '', subject: '', grade: '', startDate: '', status: 'ACTIVE', gvcnEmail: '' };

export default function Classes() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('roster');
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [assignedTeachers, setAssignedTeachers] = useState([]);

  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [q, setQ] = useState('');
  const [uploading, setUploading] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState('');

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [allClasses, setAllClasses] = useState([]);
  const [joinClassId, setJoinClassId] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [cls, stu, tch, vio] = await Promise.all([
        api('getClasses', { myClassesOnly: true }, user.email),
        (isAdmin || user.role === 'TEACHER') ? api('getStudents', {}, user.email) : Promise.resolve([]),
        isAdmin ? api('getTeachers', {}, user.email) : Promise.resolve([]),
        api('getViolations', {}, user.email),
      ]);
      setClasses(cls || []);
      setStudents(stu || []);
      setTeachers(tch || []);
      setViolations(vio || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function openDetail(cls) {
    setDetail(cls);
    setDetailTab('roster');
    setRosterLoading(true);
    try {
      const r = await api('getClassRoster', { classId: cls.ClassID }, user.email);
      setRoster(r || []);
      if (isAdmin) {
        const tc = await api('getClassTeachers', { classId: cls.ClassID }, user.email);
        setAssignedTeachers(tc || []);
      }
    } catch (e) { toast(e.message, 'error'); }
    finally { setRosterLoading(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(cls, e) {
    e.stopPropagation();
    setEditing(cls);
    setForm({
      className: cls.ClassName,
      subject: cls.Subject,
      grade: cls.Grade,
      startDate: cls.StartDate,
      status: cls.Status,
      gvcnEmail: cls.GVCN_Email || '',
    });
    setShowForm(true);
  }

  async function saveClass() {
    if (!form.className.trim()) { toast('Vui lòng nhập tên lớp', 'warning'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api('editClass', { classId: editing.ClassID, ...form }, user.email);
        toast('Đã cập nhật lớp học');
      } else {
        await api('addClass', form, user.email);
        toast('Đã tạo lớp học mới');
      }
      setShowForm(false);
      loadAll();
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function deleteClass(classId) {
    if (!confirm('Bạn có chắc chắn muốn xóa lớp này? Toàn bộ dữ liệu lớp sẽ bị xóa khỏi ứng dụng.')) return;
    try {
      await api('deleteClass', { classId }, user.email);
      toast('Đã xóa lớp học');
      loadAll();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function enrollStudent() {
    if (!enrollStudentId) { toast('Chọn học sinh cần thêm', 'warning'); return; }
    setEnrolling(true);
    try {
      await api('enrollStudent', { studentId: enrollStudentId, classId: detail.ClassID }, user.email);
      toast('Đã thêm học sinh vào lớp');
      setEnrollStudentId('');
      const r = await api('getClassRoster', { classId: detail.ClassID }, user.email);
      setRoster(r || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setEnrolling(false); }
  }

  async function removeStudent(studentId) {
    if (!confirm('Xóa học sinh khỏi lớp?')) return;
    try {
      await api('removeEnrollment', { studentId, classId: detail.ClassID }, user.email);
      toast('Đã xóa học sinh khỏi lớp');
      setRoster(r => r.filter(s => s.StudentID !== studentId));
    } catch (e) { toast(e.message, 'error'); }
  }

  async function assignTeacher() {
    if (!assignTeacherId) { toast('Chọn giáo viên/trợ giảng', 'warning'); return; }
    setAssigning(true);
    try {
      await api('assignTeacher', { teacherEmail: assignTeacherId, classId: detail.ClassID }, user.email);
      toast('Đã phân công giáo viên');
      setAssignTeacherId('');
      const tc = await api('getClassTeachers', { classId: detail.ClassID }, user.email);
      setAssignedTeachers(tc || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setAssigning(false); }
  }

  async function removeTeacher(teacherEmail) {
    if (!confirm('Hủy phân công giáo viên?')) return;
    try {
      await api('removeTeacherFromClass', { teacherEmail, classId: detail.ClassID }, user.email);
      toast('Đã hủy phân công');
      setAssignedTeachers(t => t.filter(x => x.Email !== teacherEmail));
    } catch (e) { toast(e.message, 'error'); }
  }

  async function saveNote(studentId) {
    if (editingNoteId !== studentId) return;
    try {
      await api('editStudent', { studentId, note: tempNote }, user.email);
      setRoster(r => r.map(x => x.StudentID === studentId ? { ...x, Note: tempNote } : x));
      setStudents(s => s.map(x => x.StudentID === studentId ? { ...x, Note: tempNote } : x));
      toast('Đã cập nhật ghi chú', 'success');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setEditingNoteId(null);
    }
  }

  async function openJoinClass() {
    try {
      const res = await api('getClasses', { allClasses: true }, user.email);
      setAllClasses(res || []);
      setJoinClassId('');
      setShowJoinModal(true);
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function joinClass() {
    if (!joinClassId) { toast('Vui lòng chọn lớp', 'warning'); return; }
    setJoining(true);
    try {
      await api('assignTeacher', { teacherEmail: user.email, classId: joinClassId }, user.email);
      toast('Đã thêm lớp thành công');
      setShowJoinModal(false);
      loadAll();
    } catch (e) { toast(e.message, 'error'); }
    finally { setJoining(false); }
  }

  async function handleGlobalFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      let importedClasses = 0;
      let importedStudents = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const studentsToImport = [];
        
        for (let i = 6; i < Math.min(rows.length, 38); i++) {
          const row = rows[i] || [];
          
          // Check if it's the end of the list (e.g., "Thống kê" row)
          const rowStr = row.map(c => String(c || '').trim().toLowerCase()).join(' ');
          if (rowStr.includes('thống kê')) {
            break;
          }
          
          // Must have a valid STT to be a student row
          const stt = parseInt(row[0], 10);
          if (isNaN(stt)) continue;

          const studentCode = String(row[1] || '').trim();
          const fullName = String(row[3] || '').trim(); // Cột D (Chính xác tên học sinh)
          
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
        
          // Attempt to find the class name in the first 6 rows
          let className = String(sheetName).trim();
          let foundClassName = false;
          for (let r = 0; r < 6; r++) {
            if (rows[r]) {
              for (let c = 0; c < 10; c++) {
                const cellStr = String(rows[r][c] || '').trim();
                const match = cellStr.match(/Lớp:\s*([^-\n]+)/i);
                if (match && match[1].trim()) {
                  className = match[1].trim();
                  foundClassName = true;
                  break;
                }
              }
            }
            if (foundClassName) break;
          }
          
          if (studentsToImport.length > 0) {
            let cls = classes.find(c => c.ClassName === className);
            let classId;
            if (cls) {
              classId = cls.ClassID;
            } else {
              const res = await api('addClass', { className: className, status: 'ACTIVE' }, user.email);
              // Fetch classes again if classId is missing
              let newClassId = res.classId;
              if (!newClassId) {
                const newClasses = await api('getClasses', {}, user.email);
                const newCls = newClasses.find(c => c.ClassName === className);
                newClassId = newCls ? newCls.ClassID : undefined;
              }
              classId = newClassId;
              if (classId) {
                classes.push({ ClassID: classId, ClassName: className });
                importedClasses++;
              }
            }
            
            if (classId) {
              await api('importClassRoster', { classId: classId, students: studentsToImport }, user.email);
              importedStudents += studentsToImport.length;
            }
          }
      }
      
      toast(`Import thành công! Đã tạo mới ${importedClasses} lớp, cập nhật ${importedStudents} học sinh.`);
      loadAll();
      
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = null; // reset file input
    }
  }

  async function handleClassFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const studentsToImport = [];
      
      for (let i = 6; i < Math.min(rows.length, 38); i++) {
        const row = rows[i] || [];
        const rowStr = row.map(c => String(c || '').trim().toLowerCase()).join(' ');
        if (rowStr.includes('thống kê')) break;
        const stt = parseInt(row[0], 10);
        if (isNaN(stt)) continue;
        const studentCode = String(row[1] || '').trim();
        const fullName = String(row[3] || '').trim(); // Cột D (Chính xác tên học sinh)
        
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
      
      if (studentsToImport.length > 0) {
        await api('importClassRoster', { classId: detail.ClassID, students: studentsToImport }, user.email);
        toast(`Đã cập nhật ${studentsToImport.length} học sinh vào lớp!`, 'success');
        const r = await api('getClassRoster', { classId: detail.ClassID }, user.email);
        setRoster(r || []);
        loadAll();
      } else {
        toast('Không tìm thấy học sinh nào hợp lệ trong file', 'warning');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  }

  const filtered = classes.filter(c => {
    const cName = String(c.ClassName || '');
    const cSubj = String(c.Subject || '');
    const query = String(q || '');
    return cName.toLowerCase().includes(query.toLowerCase()) ||
           cSubj.toLowerCase().includes(query.toLowerCase());
  });

  const unenrolledStudents = students.filter(s => !roster.find(r => r.StudentID === s.StudentID));
  const unassignedTeachers = teachers.filter(t => !assignedTeachers.find(a => a.Email === t.Email));

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Đang tải...</span></div>;

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1 className="page-title">🏫 <span>Lớp học</span></h1>
        <p className="page-sub">
          {isAdmin ? `Quản lý ${classes.length} lớp học` : `${classes.length} lớp được phân công`}
        </p>
      </div>

      <div className="filter-bar">
        <input className="search-box" placeholder="Tìm lớp học..." value={q} onChange={e => setQ(e.target.value)} />
        {(isAdmin || user.role === 'TEACHER') && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <label className="btn btn-secondary" style={{ margin: 0, cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? 'Đang tải...' : '📁 Tải Excel'}
              <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleGlobalFileUpload} disabled={uploading} />
            </label>
            {!isAdmin && <button className="btn btn-secondary" onClick={openJoinClass}>+ Nhận lớp</button>}
            <button className="btn btn-primary" onClick={openAdd}>+ Tạo lớp mới</button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <div className="empty-icon">🏫</div>
            <h3>Chưa có lớp học nào</h3>
            <p>{(isAdmin || user.role === 'TEACHER') ? 'Nhấn "+ Tạo lớp mới" hoặc "Tải Excel" để bắt đầu' : 'Chưa có lớp nào được phân công cho bạn'}</p>
          </div>
        </div></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(cls => (
            <div key={cls.ClassID} className="card" style={{ cursor: 'pointer' }} onClick={() => openDetail(cls)}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{cls.ClassName}</span>
                <span className={`badge ${cls.Status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}
                  style={{ fontSize: '0.7rem' }}>{cls.Status === 'ACTIVE' ? 'Đang học' : 'Dừng'}</span>
              </div>
              <div className="card-body" style={{ fontSize: '0.875rem' }}>
                <div style={{ marginBottom: 6 }}>
                  {cls.Subject && <span className="badge badge-info" style={{ marginRight: 6 }}>{cls.Subject}</span>}
                  {cls.Grade && <span className="badge badge-warning">Khối {cls.Grade}</span>}
                </div>
                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>📅 {cls.StartDate ? fmtDate(cls.StartDate) : 'Chưa rõ ngày'}</div>
                {cls.GVCN_Email && (
                  <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', marginTop: 4 }}>
                    👨‍🏫 GVCN: {teachers.find(t => t.Email === cls.GVCN_Email)?.Name || cls.GVCN_Email}
                  </div>
                )}
                {(isAdmin || user.role === 'TEACHER') && (
                  <div style={{ marginTop: 10, display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={e => openEdit(cls, e)}>✏️ Sửa</button>
                    <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); deleteClass(cls.ClassID); }}>🗑️ Xóa</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Class Modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? '✏️ Sửa lớp học' : '+ Tạo lớp mới'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={saveClass} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </>}
      >
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tên lớp *</label>
            <input className="form-control" value={form.className} onChange={e => setForm(f => ({...f, className: e.target.value}))} placeholder="VD: Toán 8A" />
          </div>
          <div className="form-group">
            <label className="form-label">Môn học</label>
            <input className="form-control" value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))} placeholder="VD: Toán, Văn, Anh..." />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Khối lớp</label>
            <input className="form-control" value={form.grade} onChange={e => setForm(f => ({...f, grade: e.target.value}))} placeholder="VD: 8" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Ngày bắt đầu</label>
            <input className="form-control" type="date" value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />
          </div>
          {editing && (
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                <option value="ACTIVE">Đang học</option>
                <option value="INACTIVE">Dừng</option>
              </select>
            </div>
          )}
          {isAdmin && (
            <div className="form-group">
              <label className="form-label">Giáo viên chủ nhiệm (GVCN)</label>
              <select className="form-select" value={form.gvcnEmail} onChange={e => setForm(f => ({...f, gvcnEmail: e.target.value}))}>
                <option value="">-- Không có --</option>
                {teachers.map(t => (
                  <option key={t.Email} value={t.Email}>{t.Name} ({t.Email})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Modal>

      {/* Class Detail Modal */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={`🏫 ${detail?.ClassName || ''}`}
        size="modal-lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <button className="btn btn-ghost" onClick={() => setDetail(null)}>Đóng</button>
          </div>
        }
      >
        {detail && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, padding: '10px 14px', background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem' }}>
              {detail.Subject && <span>📚 {detail.Subject}</span>}
              {detail.Grade && <span>🏷️ Khối {detail.Grade}</span>}
              {detail.StartDate && <span>📅 {fmtDate(detail.StartDate)}</span>}
            </div>

            <div className="tabs">
              <button className={`tab ${detailTab === 'roster' ? 'active' : ''}`} onClick={() => setDetailTab('roster')}>👥 Danh sách ({roster.length})</button>
              {isAdmin && <button className={`tab ${detailTab === 'teachers' ? 'active' : ''}`} onClick={() => setDetailTab('teachers')}>👨‍🏫 Giáo viên ({assignedTeachers.length})</button>}
            </div>

            {rosterLoading ? (
              <div className="loading-state"><div className="spinner" /><span>Đang tải...</span></div>
            ) : detailTab === 'roster' ? (
              <>
                {(isAdmin || user.role === 'TEACHER') && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <select className="form-select" style={{ flex: 1 }} value={enrollStudentId} onChange={e => setEnrollStudentId(e.target.value)}>
                      <option value="">-- Chọn học sinh để thêm vào lớp --</option>
                      {unenrolledStudents.map(s => (
                        <option key={s.StudentID} value={s.StudentID}>{s.FullName} ({s.StudentID})</option>
                      ))}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={enrollStudent} disabled={enrolling}>
                      {enrolling ? '...' : '+ Thêm'}
                    </button>
                    <label className="btn btn-secondary btn-sm" style={{ margin: 0, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                      {uploading ? '...' : '📁 Tải danh sách'}
                      <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleClassFileUpload} disabled={uploading} />
                    </label>
                  </div>
                )}
                {roster.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">👤</div><h3>Chưa có học sinh</h3></div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Học sinh</th><th>SĐT phụ huynh</th><th>Link phụ huynh</th>{(isAdmin || user.role === 'TEACHER') && <th></th>}</tr></thead>
                      <tbody>
                        {roster.map(s => {
                          const vCount = violations.filter(v => v.StudentID === s.StudentID).length;
                          return (
                          <tr key={s.StudentID} style={s.Note ? { backgroundColor: '#fef2f2' } : {}}>
                            <td>
                              <strong style={{ color: s.Note ? '#ef4444' : 'inherit' }}>{s.FullName}</strong>
                              {vCount >= 3 && (
                                <span className="badge badge-danger" style={{ marginLeft: 8, fontSize: '0.65rem', padding: '2px 6px' }} title="Học sinh này vi phạm thường xuyên">
                                  🚨 {vCount} vi phạm
                                </span>
                              )}
                              <div>
                                {editingNoteId === s.StudentID ? (
                                  <input 
                                    autoFocus
                                    className="form-control" 
                                    style={{ marginTop: 4, padding: '2px 8px', fontSize: '0.8rem', height: '28px' }}
                                    value={tempNote} 
                                    onChange={e => setTempNote(e.target.value)}
                                    onBlur={() => saveNote(s.StudentID)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveNote(s.StudentID); else if (e.key === 'Escape') setEditingNoteId(null); }}
                                    placeholder="Nhập ghi chú..."
                                  />
                                ) : (
                                  <div 
                                    onClick={() => { setEditingNoteId(s.StudentID); setTempNote(s.Note || ''); }}
                                    style={{ fontSize: '0.8rem', color: s.Note ? '#ef4444' : 'var(--primary)', marginTop: '2px', fontWeight: '500', cursor: 'pointer', display: 'inline-block' }}
                                    title="Nhấn để sửa ghi chú"
                                  >
                                    {s.Note ? `⚠️ ${s.Note}` : '+ Thêm ghi chú'}
                                  </div>
                                )}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.StudentID}</div>
                            </td>
                            <td>{s.ParentPhone || '—'}</td>
                            <td>
                              <button className="btn btn-ghost btn-sm" onClick={() => {
                                const url = `${window.location.origin}/parent/${s.StudentID}`;
                                navigator.clipboard?.writeText(url);
                                toast('Đã sao chép link phụ huynh!');
                              }}>📋 Copy link</button>
                            </td>
                            {(isAdmin || user.role === 'TEACHER') && (
                              <td><button className="btn btn-danger btn-sm" onClick={() => removeStudent(s.StudentID)}>Xóa</button></td>
                            )}
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              /* Teacher assignment tab */
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <select className="form-select" style={{ flex: 1 }} value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}>
                    <option value="">-- Chọn giáo viên / trợ giảng --</option>
                    {unassignedTeachers.map(t => (
                      <option key={t.Email} value={t.Email}>{t.Name} ({t.Role === 'TEACHER' ? 'GV' : 'TG'}) - {t.Email}</option>
                    ))}
                  </select>
                  <button className="btn btn-primary btn-sm" onClick={assignTeacher} disabled={assigning}>
                    {assigning ? '...' : '+ Phân công'}
                  </button>
                </div>
                {assignedTeachers.length === 0 ? (
                  <div className="empty-state"><div className="empty-icon">👨‍🏫</div><h3>Chưa phân công giáo viên</h3></div>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Giáo viên</th><th>Vai trò</th><th>Email</th><th></th></tr></thead>
                      <tbody>
                        {assignedTeachers.map(t => (
                          <tr key={t.Email}>
                            <td><strong>{t.Name}</strong></td>
                            <td><span className={`badge ${t.Role === 'TEACHER' ? 'badge-teacher' : 'badge-warning'}`}>{t.Role === 'TEACHER' ? 'Giáo viên' : 'Trợ giảng'}</span></td>
                            <td style={{ fontSize: '0.83rem' }}>{t.Email}</td>
                            <td><button className="btn btn-danger btn-sm" onClick={() => removeTeacher(t.Email)}>Hủy</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Modal>
      {/* Join Class Modal */}
      <Modal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Nhận lớp giảng dạy"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowJoinModal(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={joinClass} disabled={joining}>
            {joining ? 'Đang xử lý...' : 'Xác nhận'}
          </button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Chọn lớp học</label>
          <select className="form-select" value={joinClassId} onChange={e => setJoinClassId(e.target.value)}>
            <option value="">-- Chọn lớp --</option>
            {allClasses.map(c => (
              <option key={c.ClassID} value={c.ClassID}>{c.ClassName}</option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
