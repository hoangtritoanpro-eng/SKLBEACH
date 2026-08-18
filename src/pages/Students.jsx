import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import Modal from '../components/Modal';
import * as XLSX from 'xlsx';

const EMPTY = { fullName: '', parentName: '', parentPhone: '', parentEmail: '', note: '', status: 'ACTIVE' };

export default function Students() {
  const { user } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('getStudents', {}, user.email).then(d => setStudents(d || [])).catch(e => toast(e.message, 'error')).finally(() => setLoading(false));
  }, []);

  function openAdd() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(s) {
    setEditing(s);
    setForm({ fullName: s.FullName, parentName: s.ParentName, parentPhone: s.ParentPhone, parentEmail: s.ParentEmail, note: s.Note, status: s.Status });
    setShowModal(true);
  }

  async function save() {
    if (!form.fullName.trim()) { toast('Vui lòng nhập tên học sinh', 'warning'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api('editStudent', { studentId: editing.StudentID, ...form }, user.email);
        toast('Đã cập nhật học sinh');
        setStudents(prev => prev.map(s => s.StudentID === editing.StudentID ? { ...s, FullName: form.fullName, ParentName: form.parentName, ParentPhone: form.parentPhone, ParentEmail: form.parentEmail, Note: form.note, Status: form.status } : s));
      } else {
        const newS = await api('addStudent', form, user.email);
        toast('Đã thêm học sinh mới');
        setStudents(prev => [...prev, newS]);
      }
      setShowModal(false);
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function deleteStudent(studentId) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hoàn toàn học sinh này khỏi hệ thống? (Thao tác này sẽ xóa cả dữ liệu trong các lớp học)')) return;
    try {
      await api('deleteStudent', { studentId }, user.email);
      toast('Đã xóa học sinh thành công');
      setStudents(prev => prev.filter(s => s.StudentID !== studentId));
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        
        if (data.length < 2) {
          toast('File Excel không có dữ liệu', 'error');
          return;
        }

        let headerRowIdx = -1;
        let nameIdx = -1;
        let headers = [];
        
        for (let i = 0; i < Math.min(30, data.length); i++) {
          const row = data[i].map(c => String(c).toLowerCase().trim());
          const idx = row.findIndex(c => c === 'họ và tên' || c === 'họ tên' || c === 'tên' || c === 'name' || c.includes('họ và tên'));
          if (idx !== -1) {
            headerRowIdx = i;
            nameIdx = idx;
            headers = row;
            break;
          }
        }

        if (headerRowIdx === -1) {
          toast('Không tìm thấy dòng tiêu đề có cột "Họ và tên" (quét 30 dòng đầu)', 'error');
          return;
        }

        // Handle merged name columns (Họ | Tên)
        let isNameMerged = false;
        if (headers[nameIdx + 1] === '') {
           isNameMerged = true;
        }

        const phoneIdx = headers.findIndex(h => h.includes('sđt') || h.includes('điện thoại') || h.includes('phone') || h.includes('dt'));
        const parentIdx = headers.findIndex(h => h.includes('phụ huynh') || h.includes('mẹ') || h.includes('bố'));
        const emailIdx = headers.findIndex(h => h.includes('email'));
        const noteIdx = headers.findIndex(h => h.includes('ghi chú') || h.includes('note'));
        
        const studentsToImport = [];
        for(let i = headerRowIdx + 1; i < data.length; i++) {
           const row = data[i];
           if (!row || !String(row[nameIdx]).trim()) continue;
           
           let fullName = String(row[nameIdx]).trim();
           if (isNameMerged && row[nameIdx + 1] && String(row[nameIdx + 1]).trim()) {
              fullName += ' ' + String(row[nameIdx + 1]).trim();
           }

           studentsToImport.push({
             fullName: fullName,
             parentPhone: phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '',
             parentName: parentIdx !== -1 && row[parentIdx] ? String(row[parentIdx]).trim() : '',
             parentEmail: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : '',
             note: noteIdx !== -1 && row[noteIdx] ? String(row[noteIdx]).trim() : '',
           });
        }

        if (studentsToImport.length === 0) {
          toast('Không tìm thấy học sinh nào hợp lệ', 'warning');
          return;
        }

        const res = await api('importStudents', { students: studentsToImport }, user.email);
        toast(res.message || `Đã nhập ${studentsToImport.length} học sinh`);
        // Reload list
        const newList = await api('getStudents', {}, user.email);
        setStudents(newList || []);
      } catch (err) {
        toast('Lỗi đọc file Excel: ' + err.message, 'error');
      } finally {
        setLoading(false);
        e.target.value = ''; // Reset
      }
    };
    reader.readAsBinaryString(file);
  };

  const filtered = students.filter(s =>
    s.FullName?.toLowerCase().includes(q.toLowerCase()) ||
    s.ParentPhone?.includes(q) ||
    s.StudentID?.includes(q)
  );

  const parentLink = (sid) => `${window.location.origin}/parent/${sid}`;

  if (loading) return <div className="loading-state"><div className="spinner" /><span>Đang tải...</span></div>;

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1 className="page-title">👤 <span>Học sinh</span></h1>
        <p className="page-sub">{students.length} học sinh đã đăng ký</p>
      </div>

      <div className="filter-bar">
        <input className="search-box" placeholder="Tìm theo tên, SĐT, mã..." value={q} onChange={e => setQ(e.target.value)} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <label className="btn btn-secondary" style={{ margin: 0, cursor: 'pointer' }}>
            📄 Nhập Excel
            <input type="file" accept=".xlsx, .xls, .csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>
          <button className="btn btn-primary" onClick={openAdd}>+ Thêm học sinh</button>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <h3>{q ? 'Không tìm thấy' : 'Chưa có học sinh'}</h3>
              <p>{!q && 'Nhấn "+ Thêm học sinh" để bắt đầu'}</p>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Mã</th><th>Họ tên</th><th>Phụ huynh</th><th>SĐT</th><th>Trạng thái</th><th>Link PH</th><th>Thao tác</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.StudentID}>
                    <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.StudentID}</span></td>
                    <td><strong>{s.FullName}</strong>{s.Note && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.Note}</div>}</td>
                    <td>{s.ParentName || '—'}</td>
                    <td>{s.ParentPhone || '—'}</td>
                    <td><span className={`badge ${s.Status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{s.Status === 'ACTIVE' ? 'Đang học' : 'Nghỉ'}</span></td>
                    <td>
                      <div className="link-box" style={{ maxWidth: 180 }}>
                        <span>{parentLink(s.StudentID)}</span>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} title="Copy link" onClick={() => { navigator.clipboard?.writeText(parentLink(s.StudentID)); toast('Đã copy link!'); }}>📋</button>
                      </div>
                    </td>
                    <td className="actions">
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>✏️ Sửa</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteStudent(s.StudentID)}>🗑️ Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '✏️ Sửa thông tin học sinh' : '+ Thêm học sinh mới'}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Hủy</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">Họ tên học sinh *</label>
          <input className="form-control" value={form.fullName} onChange={e => setForm(f => ({...f, fullName: e.target.value}))} placeholder="Nguyễn Văn A" autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tên phụ huynh</label>
            <input className="form-control" value={form.parentName} onChange={e => setForm(f => ({...f, parentName: e.target.value}))} placeholder="Nguyễn Văn B" />
          </div>
          <div className="form-group">
            <label className="form-label">SĐT phụ huynh</label>
            <input className="form-control" type="tel" value={form.parentPhone} onChange={e => setForm(f => ({...f, parentPhone: e.target.value}))} placeholder="0901..." />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Email phụ huynh</label>
            <input className="form-control" type="email" value={form.parentEmail} onChange={e => setForm(f => ({...f, parentEmail: e.target.value}))} placeholder="email@gmail.com" />
          </div>
          {editing && (
            <div className="form-group">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                <option value="ACTIVE">Đang học</option>
                <option value="INACTIVE">Nghỉ học</option>
              </select>
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Ghi chú</label>
          <input className="form-control" value={form.note} onChange={e => setForm(f => ({...f, note: e.target.value}))} placeholder="Ghi chú thêm..." />
        </div>
      </Modal>
    </div>
  );
}
