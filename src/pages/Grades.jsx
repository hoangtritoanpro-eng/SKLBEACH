import { useState, useEffect, useCallback } from 'react';
import { api, today } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Users, Save, ChevronDown, Plus, Minus } from 'lucide-react';

export default function Grades() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState('CHAM'); // 'CHAM' (Points) or 'DIEM_TX' (Scores)

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [roster, setRoster] = useState([]);
  const [scoreMap, setScoreMap] = useState({}); // For 'DIEM_TX'
  
  // For 'CHAM' (Points)
  const [totalPointsMap, setTotalPointsMap] = useState({});
  const [pointsDiffMap, setPointsDiffMap] = useState({});
  const [pointsReason, setPointsReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dice Feature State
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [randomStudent, setRandomStudent] = useState(null);

  const COLUMNS = ['C1', 'C2', 'C3', 'C4'];

  useEffect(() => {
    api('getClasses', {}, user.email).then(setClasses).catch(e => toast(e.message, 'error'));
  }, [user.email, toast]);

  const loadClass = useCallback(async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const [rosterData, scoresData, pointsData] = await Promise.all([
        api('getClassRoster', { classId }, user.email),
        api('getScores', { classId }, user.email),
        api('getPoints', { classId }, user.email)
      ]);
      setRoster(rosterData || []);
      
      // Map Scores
      const sMap = {};
      (scoresData || []).forEach(s => {
        if (COLUMNS.includes(s.ExamName)) {
          if (!sMap[s.StudentID]) sMap[s.StudentID] = {};
          sMap[s.StudentID][s.ExamName] = s.Score;
        }
      });
      setScoreMap(sMap);

      // Map Points
      const pMap = {};
      (pointsData || []).forEach(p => {
        if (!pMap[p.StudentID]) pMap[p.StudentID] = 0;
        pMap[p.StudentID] += parseInt(p.PointsAdded, 10) || 0;
      });
      setTotalPointsMap(pMap);
      setPointsDiffMap({}); // Reset diff map
      
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [user.email, toast]);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
    loadClass(e.target.value);
  };

  const handleScoreChange = (studentId, col, value) => {
    setScoreMap(prev => {
      const newMap = { ...prev };
      if (!newMap[studentId]) newMap[studentId] = {};
      newMap[studentId] = { ...newMap[studentId], [col]: value };
      return newMap;
    });
  };

  const handlePointChange = (studentId, diff) => {
    setPointsDiffMap(prev => {
      const current = prev[studentId] || 0;
      return { ...prev, [studentId]: current + diff };
    });
  };

  const handleSaveScores = async () => {
    if (!selectedClass) {
      toast('Vui lòng chọn lớp', 'warning');
      return;
    }
    setSaving(true);
    try {
      const promises = COLUMNS.map(col => {
        const records = roster
          .filter(s => scoreMap[s.StudentID]?.[col] !== undefined && scoreMap[s.StudentID]?.[col] !== '')
          .map(s => ({ studentId: s.StudentID, score: parseFloat(scoreMap[s.StudentID][col]) }));
          
        if (records.length > 0) {
          return api('addScores', { classId: selectedClass, examName: col, maxScore: 10, date: today(), records }, user.email);
        }
        return Promise.resolve(null);
      });
      
      await Promise.all(promises);
      toast('Đã lưu điểm (Sổ Điểm) thành công!', 'success');
      loadClass(selectedClass); 
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePoints = async () => {
    const changes = Object.keys(pointsDiffMap).filter(id => pointsDiffMap[id] !== 0);
    if (changes.length === 0) return;
    
    if (!pointsReason.trim()) {
      toast('Vui lòng nhập lý do cộng/trừ điểm', 'warning');
      return;
    }

    setSaving(true);
    try {
      const promises = changes.map(studentId => {
        const diff = pointsDiffMap[studentId];
        return api('addPoints', {
          classId: selectedClass,
          studentId: studentId,
          pointsAdded: diff,
          reason: pointsReason.trim(),
          date: today()
        }, user.email);
      });

      await Promise.all(promises);
      toast(`Đã cập nhật điểm cho ${changes.length} học sinh!`, 'success');
      setPointsReason('');
      loadClass(selectedClass);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRollDice = () => {
    if (roster.length === 0) {
      toast('Lớp chưa có học sinh để chọn', 'warning');
      return;
    }
    setShowDiceModal(true);
    setIsRolling(true);
    
    let rollCount = 0;
    const maxRolls = 20; // 2 seconds at 100ms
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * roster.length);
      setRandomStudent(roster[randomIdx]);
      rollCount++;
      
      if (rollCount >= maxRolls) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 100);
  };

  return (
    <div className="fade-up">
      <div className="grades-top-bar">
        <div className="grades-class-select-wrap">
          <Users size={18} color="var(--primary)" />
          <select className="grades-class-select" value={selectedClass} onChange={handleClassChange}>
            <option value="">Lớp CLASS ...</option>
            {classes.map(c => (
              <option key={c.ClassID} value={c.ClassID}>Lớp {c.ClassName}</option>
            ))}
          </select>
          <ChevronDown size={16} color="var(--primary)" style={{ marginLeft: '-15px', pointerEvents: 'none' }} />
        </div>
      </div>

      <div className="grades-tabs">
        <button className={`grades-tab ${activeTab === 'CHAM' ? 'active' : ''}`} onClick={() => setActiveTab('CHAM')}>
          ☷ Chấm Điểm
        </button>
        <button className={`grades-tab ${activeTab === 'DIEM_TX' ? 'active' : ''}`} onClick={() => setActiveTab('DIEM_TX')}>
          ⊞ Điểm TX (4 Cột)
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Đang tải danh sách học sinh...</div>
      ) : !selectedClass ? (
        <div className="empty-state" style={{ margin: '2rem 0' }}>
          <div className="empty-icon">📋</div>
          <p>Vui lòng chọn lớp học ở phía trên</p>
        </div>
      ) : roster.length === 0 ? (
        <div className="empty-state" style={{ margin: '2rem 0' }}>
          <div className="empty-icon">📭</div>
          <p>Lớp này chưa có học sinh nào</p>
        </div>
      ) : activeTab === 'DIEM_TX' ? (
        <div className="grades-card">
          <div className="grades-card-header">
            <div className="grades-card-title">SỔ ĐIỂM (4 CỘT)</div>
            <button className="btn btn-primary" onClick={handleSaveScores} disabled={saving} style={{ padding: '8px 20px' }}>
              <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="grades-table">
              <thead>
                <tr>
                  <th>Tên HS</th>
                  <th style={{ width: '280px' }}>
                    <div className="grades-col-header">
                      {COLUMNS.map(c => <span key={c}>{c}</span>)}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {roster.map(s => (
                  <tr key={s.StudentID}>
                    <td className="grades-student-name">{s.FullName}</td>
                    <td>
                      <div className="grades-score-inputs">
                        {COLUMNS.map(col => {
                          const val = scoreMap[s.StudentID]?.[col] ?? '';
                          return (
                            <input
                              key={col}
                              type="number"
                              className={`score-input ${val !== '' ? 'filled' : ''}`}
                              min="0"
                              max="10"
                              step="0.5"
                              value={val}
                              onChange={e => handleScoreChange(s.StudentID, col, e.target.value)}
                            />
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="points-list">
          {roster.map(s => {
            const diff = pointsDiffMap[s.StudentID] || 0;
            const initial = s.FullName ? s.FullName.charAt(0).toUpperCase() : 'A';
            return (
              <div className="point-card" key={s.StudentID}>
                <div className="point-card-left">
                  <div className="point-card-user">
                    <div className="point-avatar">{initial}</div>
                    <div className="point-name">{s.FullName}</div>
                  </div>
                  <div className="point-total">{totalPointsMap[s.StudentID] || 0} đ</div>
                </div>
                
                <div className="point-controls">
                  <button className="point-btn minus" onClick={() => handlePointChange(s.StudentID, -1)}>
                    <Minus size={24} />
                  </button>
                  <input 
                    type="number" 
                    className="point-diff-input" 
                    value={diff === 0 ? '' : diff} 
                    onChange={e => {
                      const val = parseInt(e.target.value, 10);
                      setPointsDiffMap(prev => ({ ...prev, [s.StudentID]: isNaN(val) ? 0 : val }));
                    }}
                    placeholder="0"
                  />
                  <button className="point-btn plus" onClick={() => handlePointChange(s.StudentID, 1)}>
                    <Plus size={24} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Fixed Bottom Bar */}
          <div className="points-bottom-bar">
            <div className="points-reason-icon dice-btn" onClick={handleRollDice} title="Chọn học sinh ngẫu nhiên">
              <span style={{ fontSize: '1.5rem' }}>🎲</span>
            </div>
            <input 
              type="text" 
              className="points-reason-input" 
              placeholder="Lý do..." 
              value={pointsReason}
              onChange={e => setPointsReason(e.target.value)}
            />
            <button 
              className="points-save-btn" 
              onClick={handleSavePoints}
              disabled={saving || Object.keys(pointsDiffMap).every(id => pointsDiffMap[id] === 0)}
            >
              <Save size={20} /> {saving ? 'ĐANG LƯU' : 'LƯU'}
            </button>
          </div>
        </div>
      )}

      {/* Dice Modal */}
      {showDiceModal && (
        <div className="dice-modal-overlay">
          <div className="dice-modal-content">
            <div className="dice-modal-title">Học Sinh May Mắn</div>
            <div className={`dice-rolling-name ${isRolling ? 'rolling' : 'finished'}`}>
              {randomStudent ? randomStudent.FullName : '...'}
            </div>
            {!isRolling && (
              <button className="dice-close-btn" onClick={() => setShowDiceModal(false)}>
                ĐÓNG
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
