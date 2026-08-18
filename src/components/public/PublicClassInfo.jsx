import { useState, useEffect, useMemo } from 'react';
import { api, fmtDate } from '../../api';

export default function PublicClassInfo() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  
  const [lessons, setLessons] = useState([]);
  
  // Global data
  const [allPoints, setAllPoints] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('lessons');

  useEffect(() => {
    // Load initial global data
    setLoading(true);
    Promise.all([
      api('getClasses', { public: true }),
      api('getPoints', { public: true }),
      api('getStudents', { public: true }) // Modified in backend to return limited fields for privacy
    ]).then(([cls, pts, stu]) => {
      setClasses(cls || []);
      setAllPoints(pts || []);
      setAllStudents(stu || []);
    }).catch(e => {
      setError('Lỗi tải dữ liệu: ' + e.message);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'lessons') {
      if (selectedClass) {
        setLoading(true);
        api('getLessons', { classId: selectedClass, public: true })
          .then(lsns => setLessons(lsns || []))
          .catch(e => setError(e.message))
          .finally(() => setLoading(false));
      } else {
        setLessons([]);
      }
    }
  }, [selectedClass, activeTab]);

  const pointsStats = useMemo(() => {
    const map = {};
    allPoints.forEach(p => {
      const s = allStudents.find(x => x.StudentID === p.StudentID);
      const name = s ? s.FullName : p.StudentID;
      if (!map[name]) map[name] = 0;
      map[name] += Number(p.PointsAdded) || 0;
    });
    return Object.keys(map).map(k => ({ name: k, total: map[k] })).sort((a,b) => b.total - a.total);
  }, [allPoints, allStudents]);

  return (
    <div className="card">
      <div className="card-header" style={{ background: 'var(--gradient)', color: 'white' }}>
        🏫 Thông tin toàn trường
      </div>
      <div className="card-body">
        <div className="tabs" style={{ marginBottom: '20px' }}>
          <button className={`tab ${activeTab === 'lessons' ? 'active' : ''}`} onClick={() => setActiveTab('lessons')}>📖 Sổ báo bài</button>
          <button className={`tab ${activeTab === 'points' ? 'active' : ''}`} onClick={() => setActiveTab('points')}>⭐ Bảng vinh danh</button>
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
            {pointsStats.length === 0 ? <div className="empty-state">Chưa có dữ liệu khen thưởng</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>🏆 Học sinh xuất sắc (Top Điểm)</h5>
                {pointsStats.map((p, idx) => (
                  <div key={p.name} style={{ padding: '10px 16px', border: '1px solid #bbf7d0', borderRadius: '8px', background: '#f0fdf4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: idx < 3 ? '#eab308' : '#94a3b8', fontSize: '1.1rem' }}>#{idx + 1}</span>
                      <strong style={{ color: '#166534', fontSize: '0.95rem' }}>{p.name}</strong>
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.85rem' }}>
                      {p.total} ⭐
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
