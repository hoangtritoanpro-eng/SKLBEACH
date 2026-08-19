import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, fmtDate, today } from '../api';
import Modal from '../components/Modal';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Violations() {
  const { user } = useAuth();
  const toast = useToast();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today(), studentId: '', reason: '', severity: 'Minor', actionTaken: '' });

  useEffect(() => {
    api('getClasses', {}, user.email).then(setClasses).catch(e => toast(e.message, 'error'));
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadData();
    } else {
      setViolations([]);
      setStudents([]);
    }
  }, [selectedClass]);

  async function loadData() {
    setLoading(true);
    try {
      const [vios, stu] = await Promise.all([
        api('getViolations', { classId: selectedClass }, user.email),
        api('getClassRoster', { classId: selectedClass }, user.email)
      ]);
      setViolations(vios || []);
      setStudents(stu || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function saveViolation(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('addViolation', { classId: selectedClass, ...form }, user.email);
      toast('Đã lưu vi phạm thành công');
      setShowModal(false);
      loadData();
      setForm({ date: today(), studentId: '', reason: '', severity: 'Minor', actionTaken: '' });
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  const chartData = useMemo(() => {
    const map = {};
    violations.forEach(v => {
      const s = students.find(x => x.StudentID === v.StudentID);
      const name = s ? s.FullName : v.StudentID;
      if (!map[name]) map[name] = 0;
      map[name]++;
    });
    return Object.keys(map).map(k => ({ name: k, count: map[k] }));
  }, [violations, students]);

  return (
    <div className="fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">⚠️ <span>Thống kê vi phạm</span></h1>
          <p className="page-sub">Quản lý kỷ luật và vi phạm của học sinh</p>
        </div>
        {selectedClass && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm vi phạm</button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Chọn lớp học</label>
            <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">-- Chọn lớp --</option>
              {classes.map(c => <option key={c.ClassID} value={c.ClassID}>{c.ClassName}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state"><div className="spinner" /><span>Đang tải...</span></div>}

      {!loading && selectedClass && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="card">
            <div className="card-header">Biểu đồ vi phạm theo học sinh</div>
            <div className="card-body" style={{ height: '300px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-light)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--text-light)' }} />
                    <Tooltip cursor={{ fill: 'var(--surface-50)' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Số lần vi phạm" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">Chưa có dữ liệu vi phạm</div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">Lịch sử vi phạm</div>
            <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {violations.length === 0 ? (
                <div className="empty-state">Lớp không có vi phạm nào</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {violations.map(v => {
                    const stu = students.find(s => s.StudentID === v.StudentID);
                    return (
                      <div key={v.ViolationID} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-50)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--text)' }}>{stu ? stu.FullName : v.StudentID}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{fmtDate(v.Date)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 12, background: v.Severity === 'Major' ? '#fee2e2' : '#fef3c7', color: v.Severity === 'Major' ? '#991b1b' : '#92400e', fontWeight: 600 }}>
                            {v.Severity === 'Major' ? 'Nghiêm trọng' : 'Nhắc nhở'}
                          </span>
                          <span style={{ fontSize: '0.9rem' }}>{v.Reason}</span>
                        </div>
                        {v.ActionTaken && <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 6, background: 'var(--background)', padding: 6, borderRadius: 4 }}>Xử lý: {v.ActionTaken}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Ghi nhận vi phạm">
        <form onSubmit={saveViolation}>
          <div className="form-group">
            <label className="form-label">Học sinh</label>
            <select className="form-select" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})} required>
              <option value="">-- Chọn học sinh --</option>
              {students.map(s => <option key={s.StudentID} value={s.StudentID}>{s.FullName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ngày vi phạm</label>
            <input className="form-control" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mức độ</label>
            <select className="form-select" value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}>
              <option value="Minor">Nhắc nhở (Nhẹ)</option>
              <option value="Major">Nghiêm trọng</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Lý do vi phạm</label>
            <input className="form-control" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required placeholder="VD: Không làm bài tập về nhà" />
          </div>
          <div className="form-group">
            <label className="form-label">Hình thức xử lý (Không bắt buộc)</label>
            <input className="form-control" value={form.actionTaken} onChange={e => setForm({...form, actionTaken: e.target.value})} placeholder="VD: Chép phạt 10 lần" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu vi phạm'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
