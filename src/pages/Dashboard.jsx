import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('1_week');

  useEffect(() => {
    api('getDashboard', {}, user.email)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const { topClasses, topViolator, topRewarder } = useMemo(() => {
    if (!stats || !stats.violations || !stats.points) return { topClasses: [], topViolator: null, topRewarder: null };

    const parseDate = (dStr) => {
      if(!dStr) return 0;
      const parts = dStr.split('/');
      if(parts.length !== 3) return 0;
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    };

    const now = new Date().getTime();
    const msInDay = 24 * 60 * 60 * 1000;
    const days = filterPeriod === '1_week' ? 7 : 30;
    const limit = now - days * msInDay;

    const filteredViolations = stats.violations.filter(v => parseDate(v.Date) >= limit);
    const filteredPoints = stats.points.filter(p => parseDate(p.Date) >= limit);

    const classVioMap = {};
    filteredViolations.forEach(v => {
       if(!classVioMap[v.ClassID]) classVioMap[v.ClassID] = 0;
       classVioMap[v.ClassID]++;
    });
    const topClasses = Object.keys(classVioMap)
       .map(cid => {
         const cInfo = stats.classes?.find(c => c.ClassID === cid);
         return { ClassID: cid, ClassName: cInfo ? cInfo.ClassName : cid, Count: classVioMap[cid] };
       })
       .sort((a,b) => b.Count - a.Count)
       .slice(0, 4);

    const studentVioMap = {};
    filteredViolations.forEach(v => {
       if(!studentVioMap[v.StudentID]) studentVioMap[v.StudentID] = 0;
       studentVioMap[v.StudentID]++;
    });
    let topVioId = null;
    let maxVio = 0;
    Object.keys(studentVioMap).forEach(sid => {
       if (studentVioMap[sid] > maxVio) {
          maxVio = studentVioMap[sid];
          topVioId = sid;
       }
    });
    let topViolator = null;
    if (topVioId) {
       const sInfo = stats.students?.find(s => s.StudentID === topVioId);
       topViolator = { StudentID: topVioId, FullName: sInfo ? sInfo.FullName : topVioId, Count: maxVio };
    }

    const studentPointMap = {};
    filteredPoints.forEach(p => {
       if(!studentPointMap[p.StudentID]) studentPointMap[p.StudentID] = 0;
       studentPointMap[p.StudentID] += Number(p.PointsAdded) || 1;
    });
    let topPointId = null;
    let maxPoint = 0;
    Object.keys(studentPointMap).forEach(sid => {
       if (studentPointMap[sid] > maxPoint) {
          maxPoint = studentPointMap[sid];
          topPointId = sid;
       }
    });
    let topRewarder = null;
    if (topPointId) {
       const sInfo = stats.students?.find(s => s.StudentID === topPointId);
       topRewarder = { StudentID: topPointId, FullName: sInfo ? sInfo.FullName : topPointId, Count: maxPoint };
    }

    return { topClasses, topViolator, topRewarder };
  }, [stats, filterPeriod]);

  if (loading) return (
    <div className="loading-state">
      <div className="spinner" />
      <span>Đang tải...</span>
    </div>
  );

  const cards = [
    { icon: '👤', label: 'Học sinh', value: stats?.totalStudents ?? 0, color: '' },
    { icon: '🏫', label: 'Lớp học', value: stats?.totalClasses ?? 0 },
    { icon: '👨‍🏫', label: 'Giáo viên', value: stats?.totalTeachers ?? 0 },
    { icon: '🧑‍💼', label: 'Trợ giảng', value: stats?.totalTAs ?? 0 },
    { icon: '✅', label: 'Có mặt hôm nay', value: stats?.presentToday ?? 0 },
    { icon: '📋', label: 'Buổi hôm nay', value: stats?.totalAttToday ?? 0 },
  ];

  return (
    <div className="fade-up">
      <div className="page-header">
        <h1 className="page-title">📊 <span>Dashboard</span></h1>
        <p className="page-sub">Xin chào, <strong>{user.name}</strong>! Đây là tổng quan hôm nay.</p>
      </div>
      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <span className="stat-icon">{c.icon}</span>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">📅 Thống kê điểm danh hôm nay</div>
        <div className="card-body">
          {stats?.totalAttToday === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Chưa có dữ liệu điểm danh hôm nay</h3>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--success)' }}>{stats?.presentToday ?? 0}</div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Có mặt</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--danger)' }}>{(stats?.totalAttToday ?? 0) - (stats?.presentToday ?? 0)}</div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vắng mặt</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, background: 'var(--bg-light)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  {stats?.totalAttToday ? Math.round(stats.presentToday / stats.totalAttToday * 100) : 0}%
                </div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Tỉ lệ có mặt</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ Bảng tổng vi phạm theo lớp (Top 4)</span>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            {topClasses.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <p>Không có dữ liệu vi phạm</p>
              </div>
            ) : (
              <table className="table" style={{ margin: 0, border: 'none' }}>
                <thead>
                  <tr>
                    <th style={{ background: 'var(--bg-light)' }}>Lớp</th>
                    <th style={{ textAlign: 'center', background: 'var(--bg-light)', width: '120px' }}>Số vi phạm</th>
                  </tr>
                </thead>
                <tbody>
                  {topClasses.map(c => (
                    <tr key={c.ClassID}>
                      <td>{c.ClassName}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--danger)' }}>{c.Count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🏆 Học sinh nổi bật</span>
            <select className="input" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.9rem', minHeight: 'auto' }} value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
              <option value="1_week">1 tuần qua</option>
              <option value="1_month">1 tháng qua</option>
              <option value="all">Tất cả</option>
            </select>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--bg-light)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>Vi phạm nhiều nhất</div>
              {topViolator ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{topViolator.FullName}</strong>
                  <span style={{ color: 'var(--danger)', fontWeight: 'bold', background: '#ffebee', padding: '4px 8px', borderRadius: '12px', fontSize: '0.9rem' }}>{topViolator.Count} lỗi</span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>
              )}
            </div>
            
            <div style={{ background: 'var(--bg-light)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 600 }}>Khen thưởng nhiều nhất</div>
              {topRewarder ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{topRewarder.FullName}</strong>
                  <span style={{ color: 'var(--success)', fontWeight: 'bold', background: '#e8f5e9', padding: '4px 8px', borderRadius: '12px', fontSize: '0.9rem' }}>{topRewarder.Count} điểm</span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>Chưa có dữ liệu</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
