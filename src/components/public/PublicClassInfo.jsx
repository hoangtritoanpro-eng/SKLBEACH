import { useState, useEffect, useMemo } from 'react';
import { api, fmtDate } from '../../api';

export default function PublicClassInfo({ data }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('lessons');

  const classes = data?.classes || [];
  const allPoints = data?.points || [];
  const allStudents = data?.students || [];

  const allViolations = data?.violations || [];

  const { topRewarders, topViolators } = useMemo(() => {
    const parseDate = (dStr) => {
      if(!dStr) return 0;
      const parts = dStr.split('/');
      if(parts.length !== 3) return 0;
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    };
    const now = new Date().getTime();
    const limit = now - 7 * 24 * 60 * 60 * 1000;

    const recentPoints = allPoints.filter(p => parseDate(p.Date) >= limit);
    const pMap = {};
    recentPoints.forEach(p => {
      const s = allStudents.find(x => x.StudentID === p.StudentID);
      const name = s ? s.FullName : p.StudentID;
      if (!pMap[name]) pMap[name] = 0;
      pMap[name] += Number(p.PointsAdded) || 1;
    });
    const topRewarders = Object.keys(pMap).map(k => ({ name: k, total: pMap[k] })).sort((a,b) => b.total - a.total).slice(0, 3);

    const recentVio = allViolations.filter(v => parseDate(v.Date) >= limit);
    const vMap = {};
    recentVio.forEach(v => {
      const s = allStudents.find(x => x.StudentID === v.StudentID);
      const name = s ? s.FullName : v.StudentID;
      if (!vMap[name]) vMap[name] = 0;
      vMap[name]++;
    });
    const topViolators = Object.keys(vMap).map(k => ({ name: k, total: vMap[k] })).sort((a,b) => b.total - a.total).slice(0, 3);

    return { topRewarders, topViolators };
  }, [allPoints, allViolations, allStudents]);

  if (!data) return (
    <div className="card">
      <div className="card-header" style={{ background: 'var(--gradient)', color: 'white' }}>🏫 Thông tin toàn trường</div>
      <div className="card-body"><div className="loading-state"><div className="spinner" /></div></div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header" style={{ background: 'var(--gradient)', color: 'white' }}>
        🏫 Thông tin toàn trường
      </div>
      <div className="card-body">
        <div className="tabs" style={{ marginBottom: '20px' }}>
          <button className={`tab ${activeTab === 'lessons' ? 'active' : ''}`} onClick={() => setActiveTab('lessons')}>📖 Sổ báo bài</button>
          <button className={`tab ${activeTab === 'points' ? 'active' : ''}`} onClick={() => setActiveTab('points')}>⭐ Bảng vinh danh</button>
          <button className={`tab ${activeTab === 'violations' ? 'active' : ''}`} onClick={() => setActiveTab('violations')}>⚠️ Bảng cảnh báo</button>
        </div>

        {error && <div className="login-error">{error}</div>}
        {loading && <div className="loading-state"><div className="spinner" /></div>}

        {!loading && activeTab === 'lessons' && (
          <>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <select className="form-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">-- Chọn lớp để xem sổ báo bài --</option>
                {classes.map(c => <option key={c.ClassID} value={c.ClassID}>{c.ClassName}</option>)}
              </select>
            </div>
            
            {selectedClass && (
              <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
                {lessons.length === 0 ? <div className="empty-state">Chưa có dữ liệu báo bài</div> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {lessons.map(lsn => (
                      <div key={lsn.LessonID} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-50)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <strong style={{ color: 'var(--primary)' }}>{lsn.Topic || 'Không có tiêu đề'}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{fmtDate(lsn.Date)}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}><span style={{ whiteSpace: 'pre-wrap' }}>{lsn.Content}</span></div>
                        {lsn.Homework && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}><strong>Bài tập:</strong> <span style={{ whiteSpace: 'pre-wrap' }}>{lsn.Homework}</span></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && activeTab === 'points' && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {topRewarders.length === 0 ? <div className="empty-state">Chưa có dữ liệu khen thưởng tuần này</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>🏆 Top 3 Điểm Khen Thưởng (Tuần qua)</h5>
                {topRewarders.map((p, idx) => (
                  <div key={p.name} style={{ padding: '10px 16px', border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#cd7f32', fontSize: '1.2rem' }}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                      </span>
                      <strong style={{ color: '#166534', fontSize: '1rem' }}>{p.name}</strong>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}>
                      +{p.total}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'violations' && (
          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
            {topViolators.length === 0 ? <div className="empty-state">Không có học sinh vi phạm tuần này</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>⚠️ Top 3 Học Sinh Vi Phạm (Tuần qua)</h5>
                {topViolators.map((v, idx) => (
                  <div key={v.name} style={{ padding: '10px 16px', border: '1px solid #fecaca', borderRadius: '8px', background: '#fef2f2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.2rem' }}>
                        {idx === 0 ? '🚩' : '🔸'}
                      </span>
                      <strong style={{ color: '#991b1b', fontSize: '1rem' }}>{v.name}</strong>
                    </div>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem' }}>
                      {v.total} lỗi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
