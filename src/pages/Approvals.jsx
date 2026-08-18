import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, fmtDate } from '../api';

export default function Approvals() {
  const { user } = useAuth();
  const showToast = useToast();
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingReports();
  }, []);

  const fetchPendingReports = async () => {
    try {
      setLoading(true);
      // Fetch only pending reports
      const res = await api('getClassReports', { status: 'PENDING' }, user?.email);
      setReports(res);
    } catch (e) {
      showToast('Lỗi tải dữ liệu: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reportId, status) => {
    try {
      await api('updateClassReportStatus', { reportId, status }, user?.email);
      showToast(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} báo cáo!`, 'success');
      fetchPendingReports();
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h2>Duyệt Báo cáo Lớp học</h2>
          <p className="text-light">Xem và duyệt các báo cáo BTVN, Điểm, Thông báo từ GVBM</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Đang tải...</p>
        ) : reports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <p>Tuyệt vời! Không có báo cáo nào cần duyệt.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reports.map((r) => (
              <div key={r.ReportID} style={{
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '1.5rem',
                background: '#fff',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h3 style={{ margin: 0, color: 'var(--text)' }}>{r.ClassName}</h3>
                      <span className="badge" style={{ background: 'var(--primary-light-color)', color: 'var(--primary)' }}>
                        {r.Type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                      Ngày: {fmtDate(r.Date)} · GV: {r.TeacherName} ({r.TeacherEmail})
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn" 
                      style={{ background: '#16a34a', color: '#fff', border: 'none' }}
                      onClick={() => handleApprove(r.ReportID, 'APPROVED')}
                    >
                      ✓ Duyệt
                    </button>
                    <button 
                      className="btn" 
                      style={{ background: '#dc2626', color: '#fff', border: 'none' }}
                      onClick={() => handleApprove(r.ReportID, 'REJECTED')}
                    >
                      ✕ Từ chối
                    </button>
                  </div>
                </div>

                {r.Content && (
                  <div style={{ background: 'var(--bg-light)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                    {r.Content}
                  </div>
                )}

                {r.AudioUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>🎤 Ghi âm GV:</span>
                    <audio src={r.AudioUrl} controls style={{ height: '40px' }}></audio>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
