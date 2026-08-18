import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, fmtDate, today } from '../api';
import Modal from '../components/Modal';

export default function Lessons() {
  const { user } = useAuth();
  const toast = useToast();

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today(), topic: '', content: '', homework: '' });

  useEffect(() => {
    api('getClasses', {}, user.email)
      .then(d => { setClasses(d || []); if (d?.length === 1) setSelectedClass(d[0].ClassID); })
      .catch(e => toast(e.message, 'error'));
  }, []);

  useEffect(() => {
    if (selectedClass) loadLessons();
  }, [selectedClass]);

  async function loadLessons() {
    setLoading(true);
    try {
      const data = await api('getLessons', { classId: selectedClass }, user.email);
      setLessons(data || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function saveLesson(e) {
    e.preventDefault();
    if (!selectedClass) { toast('Chọn lớp trước khi thêm', 'warning'); return; }
    setSaving(true);
    try {
      await api('addLesson', { classId: selectedClass, ...form }, user.email);
      toast('Đã thêm bài học thành công');
      setShowModal(false);
      loadLessons();
      setForm({ date: today(), topic: '', content: '', homework: '' });
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">📖 <span>Sổ báo bài</span></h1>
          <p className="page-sub">Ghi chú nội dung buổi học và bài tập về nhà</p>
        </div>
        {selectedClass && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm báo bài</button>
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
        <div className="card">
          <div className="card-body">
            {lessons.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📖</div>
                <h3>Chưa có dữ liệu báo bài cho lớp này</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {lessons.map(lsn => (
                  <div key={lsn.LessonID} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-50)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{lsn.Topic || 'Không có tiêu đề'}</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-light)', background: 'var(--surface-100)', padding: '4px 8px', borderRadius: '12px' }}>{fmtDate(lsn.Date)}</span>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Nội dung:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{lsn.Content}</span>
                    </div>
                    <div>
                      <strong>Bài tập về nhà:</strong> <span style={{ whiteSpace: 'pre-wrap', color: 'var(--text-light)' }}>{lsn.Homework || 'Không có'}</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-lighter)', textAlign: 'right' }}>
                      Giáo viên: {lsn.TeacherEmail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Thêm Sổ báo bài">
        <form onSubmit={saveLesson}>
          <div className="form-group">
            <label className="form-label">Ngày học</label>
            <input className="form-control" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Chủ đề buổi học</label>
            <input className="form-control" value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} required placeholder="VD: Toán hình - Tam giác đều" />
          </div>
          <div className="form-group">
            <label className="form-label">Nội dung chi tiết</label>
            <textarea className="form-control" rows={3} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Tóm tắt nội dung buổi học..."></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Bài tập về nhà</label>
            <textarea className="form-control" rows={2} value={form.homework} onChange={e => setForm({...form, homework: e.target.value})} placeholder="Bài tập giao về nhà..."></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu báo bài'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
