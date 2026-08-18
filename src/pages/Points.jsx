import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, fmtDate, today } from '../api';
import Modal from '../components/Modal';

export default function Points() {
  const { user } = useAuth();
  const toast = useToast();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today(), studentId: '', pointsAdded: 10, reason: '' });

  useEffect(() => {
    api('getClasses', { allClasses: true }, user.email).then(setClasses).catch(e => toast(e.message, 'error'));
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadData();
    } else {
      setPoints([]);
      setStudents([]);
    }
  }, [selectedClass]);

  async function loadData() {
    setLoading(true);
    try {
      const [pts, stu] = await Promise.all([
        api('getPoints', { classId: selectedClass }, user.email),
        api('getClassRoster', { classId: selectedClass }, user.email)
      ]);
      setPoints(pts || []);
      setStudents(stu || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function savePoints(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('addPoints', { classId: selectedClass, ...form }, user.email);
      toast('Đã cộng điểm thành công');
      setShowModal(false);
      loadData();
      setForm({ date: today(), studentId: '', pointsAdded: 10, reason: '' });
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  const leaderboard = useMemo(() => {
    const map = {};
    students.forEach(s => map[s.StudentID] = { ...s, totalPoints: 0 });
    points.forEach(p => {
      if (map[p.StudentID]) map[p.StudentID].totalPoints += parseInt(p.PointsAdded, 10) || 0;
    });
    return Object.values(map).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [points, students]);

  return (
    <div className="fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">⭐ <span>Tích điểm</span></h1>
          <p className="page-sub">Bảng xếp hạng và quản lý điểm thưởng của học sinh</p>
        </div>
        {selectedClass && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Cộng điểm</button>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
          <div className="card">
            <div className="card-header">🏆 Bảng Xếp Hạng Điểm Thưởng</div>
            <div className="card-body">
              {leaderboard.length === 0 ? (
                <div className="empty-state">Lớp chưa có học sinh</div>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: 60, textAlign: 'center' }}>Hạng</th>
                        <th>Học sinh</th>
                        <th style={{ textAlign: 'right' }}>Tổng điểm</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((stu, idx) => (
                        <tr key={stu.StudentID}>
                          <td style={{ textAlign: 'center' }}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </td>
                          <td>
                            <strong>{stu.FullName}</strong>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#eab308' }}>{stu.totalPoints} ⭐</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">Lịch sử cộng điểm</div>
            <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {points.length === 0 ? (
                <div className="empty-state">Chưa có lịch sử cộng điểm</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {points.map(p => {
                    const stu = students.find(s => s.StudentID === p.StudentID);
                    return (
                      <div key={p.PointID} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface-50)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--text)' }}>{stu ? stu.FullName : p.StudentID}</strong>
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>+{p.PointsAdded} ⭐</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginTop: 4 }}>
                          {fmtDate(p.Date)} - {p.Reason}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-lighter)', marginTop: 4, textAlign: 'right' }}>
                          Bởi: {p.TeacherEmail}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Cộng điểm thưởng">
        <form onSubmit={savePoints}>
          <div className="form-group">
            <label className="form-label">Học sinh</label>
            <select className="form-select" value={form.studentId} onChange={e => setForm({...form, studentId: e.target.value})} required>
              <option value="">-- Chọn học sinh --</option>
              {students.map(s => <option key={s.StudentID} value={s.StudentID}>{s.FullName}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Ngày</label>
            <input className="form-control" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Số điểm cộng</label>
            <input className="form-control" type="number" value={form.pointsAdded} onChange={e => setForm({...form, pointsAdded: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Lý do</label>
            <input className="form-control" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required placeholder="VD: Trả lời đúng câu hỏi khó" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu điểm'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
