import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PublicNotices from '../components/public/PublicNotices';
import PublicLibrary from '../components/public/PublicLibrary';
import PublicClassInfo from '../components/public/PublicClassInfo';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.role === 'ADMIN' ? '/dashboard' : '/classes', { replace: true });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !pin) { setErr('Vui lòng nhập đầy đủ email và PIN'); return; }
    setErr(''); setLoading(true);
    try {
      const u = await login(email.trim(), pin.trim());
      navigate(u.role === 'ADMIN' ? '/dashboard' : '/classes', { replace: true });
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="public-dashboard">
      <div className="public-content fade-up">
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-dark)', marginBottom: '8px' }}>
            🎓 Cổng Thông Tin SkyLine Beach
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Dành cho Phụ huynh và Học sinh tra cứu thông tin nhanh</p>
        </div>

        <div className="public-grid">
          <div className="public-col">
            <PublicNotices />
            <div style={{ marginTop: '20px' }}>
              <PublicClassInfo />
            </div>
          </div>
          <div className="public-col">
            <PublicLibrary />
          </div>
        </div>
      </div>

      <div className="public-sidebar fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="login-card" style={{ width: '100%', margin: 0, border: 'none', boxShadow: 'none' }}>
          <div className="login-logo">
            <span className="icon">🔐</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Giáo viên / Quản lý</h2>
            <p style={{ fontSize: '0.8rem' }}>Đăng nhập hệ thống nội bộ</p>
          </div>
          {err && <div className="login-error">⚠ {err}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-control"
                type="email"
                placeholder="giao_vien@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">PIN</label>
              <input
                className="form-control"
                type="password"
                placeholder="Nhập PIN của bạn"
                value={pin}
                onChange={e => setPin(e.target.value)}
                maxLength={10}
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: '6px', padding: '11px' }}
            >
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Đang xử lý...</> : 'Đăng nhập'}
            </button>
          </form>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '18px' }}>
            Liên hệ quản trị viên nếu quên PIN
          </p>
        </div>
      </div>
    </div>
  );
}
