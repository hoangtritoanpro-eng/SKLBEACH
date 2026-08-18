import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, fmtDate, today } from '../api';
import Modal from '../components/Modal';

export default function Notices() {
  const { user } = useAuth();
  const toast = useToast();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today(), title: '', content: '', targetAudience: 'All' });

  useEffect(() => {
    loadNotices();
  }, []);

  async function loadNotices() {
    setLoading(true);
    try {
      const data = await api('getNotices', {}, user.email);
      setNotices(data || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function saveNotice(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('addNotice', form, user.email);
      toast('Đã đăng thông báo');
      setShowModal(false);
      loadNotices();
      setForm({ date: today(), title: '', content: '', targetAudience: 'All' });
    } catch (e) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  }

  async function handleDelete(noticeId) {
    if (!window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
    try {
      await api('deleteNotice', { noticeId }, user.email);
      toast('Đã xóa thông báo', 'success');
      loadNotices();
    } catch (e) { toast(e.message, 'error'); }
  }

  return (
    <div className="fade-up">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">📢 <span>Thông báo</span></h1>
          <p className="page-sub">Bản tin chung của Trung học Beach</p>
        </div>
        {(user.role === 'ADMIN' || user.role === 'TEACHER') && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Viết thông báo</button>
        )}
      </div>

      {loading && <div className="loading-state"><div className="spinner" /><span>Đang tải...</span></div>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {notices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📢</div>
              <h3>Chưa có thông báo nào</h3>
            </div>
          ) : (
            notices.map(ntc => (
              <div key={ntc.NoticeID} className="card" style={{ overflow: 'hidden' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--surface-50)', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)' }}>{ntc.Title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{fmtDate(ntc.Date)}</span>
                    {(user.role === 'ADMIN' || user.email === ntc.Author) && (
                      <button 
                        className="btn btn-sm" 
                        style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5', padding: '2px 8px' }} 
                        onClick={() => handleDelete(ntc.NoticeID)}
                        title="Xóa thông báo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div className="card-body">
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0 }}>{ntc.Content}</p>
                  <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                    <span>Gửi đến: <strong>{ntc.TargetAudience === 'All' ? 'toàn thể Học sinh Trung học Beach' : ntc.TargetAudience}</strong></span>
                    <span>Người đăng: {ntc.Author}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Đăng Thông Báo">
        <form onSubmit={saveNotice}>
          <div className="form-group">
            <label className="form-label">Ngày đăng</label>
            <input className="form-control" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Tiêu đề</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="VD: Lịch nghỉ Tết Nguyên Đán" />
          </div>
          <div className="form-group">
            <label className="form-label">Nội dung thông báo</label>
            <textarea className="form-control" rows={5} value={form.content} onChange={e => setForm({...form, content: e.target.value})} required placeholder="Chi tiết thông báo..."></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Đối tượng</label>
            <select className="form-select" value={form.targetAudience} onChange={e => setForm({...form, targetAudience: e.target.value})}>
              <option value="All">toàn thể Học sinh Trung học Beach</option>
              {/* Optional: Add specific classes here */}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Đăng thông báo'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
