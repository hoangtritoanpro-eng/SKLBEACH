import { fmtDate } from '../../api';

export default function PublicNotices({ notices }) {
  if (!notices) return (
    <div className="card">
      <div className="card-header" style={{ background: 'var(--gradient)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📢 <span>Thông báo mới nhất</span>
      </div>
      <div className="card-body" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner" /></div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header" style={{ background: 'var(--gradient)', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
        📢 <span>Thông báo mới nhất</span>
      </div>
      <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {notices.length === 0 && (
          <div className="empty-state">Chưa có thông báo nào</div>
        )}
        {notices.map(ntc => (
          <div key={ntc.NoticeID} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, color: 'var(--primary)' }}>{ntc.Title}</h4>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{fmtDate(ntc.Date)}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{ntc.Content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
