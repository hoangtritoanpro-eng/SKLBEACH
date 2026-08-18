import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatDateTime } from '../api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, FileText, Search } from 'lucide-react';

export default function Exams() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // We haven't implemented 'getExams' in GAS yet, but assuming it returns an empty array for now or we just show a placeholder
  useEffect(() => {
    // loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await api('getExams', {}, user.email);
      setExams(res || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = exams.filter(e => e.Name && e.Name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Đề Thi</h1>
          <p className="page-subtitle">Tạo và quản lý ngân hàng đề thi</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/exams/build')}>
          <PlusCircle size={18} style={{ marginRight: 6 }} /> Tạo đề thi mới
        </button>
      </div>

      <div className="card">
        <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
          <div className="search-box">
            <Search size={18} color="var(--text-light)" />
            <input 
              type="text" 
              placeholder="Tìm kiếm đề thi..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Mã Đề</th>
                <th>Tên Đề Thi</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="empty-state">Đang tải dữ liệu...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-state">
                    <div style={{ padding: '40px 0' }}>
                      <FileText size={48} color="var(--border)" style={{ marginBottom: 16 }} />
                      <p>Chưa có đề thi nào. Hãy tạo mới!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(ex => (
                  <tr key={ex.ExamID}>
                    <td><span className="badge">{ex.ExamID}</span></td>
                    <td style={{ fontWeight: 500 }}>{ex.Name}</td>
                    <td>{formatDateTime(ex.CreatedAt)}</td>
                    <td>
                      <button className="btn btn-sm" style={{ background: 'var(--surface)' }}>Chi tiết</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
