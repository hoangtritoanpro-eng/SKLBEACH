import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, fmtDate } from '../api';

export default function ClassReports() {
  const { user } = useAuth();
  const showToast = useToast();
  
  const [reports, setReports] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    classId: '',
    type: 'BTVN',
    content: ''
  });
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resReports, resClasses] = await Promise.all([
        api('getClassReports', {}, user?.email),
        api('getClasses', {}, user?.email)
      ]);
      setReports(resReports);
      setClasses(resClasses);
      if (resClasses.length > 0) {
        setFormData(prev => ({ ...prev, classId: resClasses[0].ClassID }));
      }
    } catch (e) {
      showToast('Lỗi tải dữ liệu: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      showToast('Không thể truy cập Microphone. Vui lòng cấp quyền.', 'error');
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setAudioUrl('');
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.classId || (!formData.content && !audioBlob)) {
      showToast('Vui lòng nhập nội dung hoặc thu âm báo cáo', 'error');
      return;
    }
    try {
      setIsSubmitting(true);
      
      let uploadedAudioUrl = '';
      if (audioBlob) {
        showToast('Đang tải lên file ghi âm...', 'info');
        const base64Data = await blobToBase64(audioBlob);
        const uploadRes = await api('uploadFile', {
          base64Data: base64Data,
          fileName: `VoiceNote_${Date.now()}.webm`,
          mimeType: 'audio/webm'
        }, user?.email);
        uploadedAudioUrl = uploadRes.fileUrl;
      }

      await api('addClassReport', {
        classId: formData.classId,
        type: formData.type,
        content: formData.content,
        audioUrl: uploadedAudioUrl
      }, user?.email);
      
      showToast('Đã gửi báo cáo thành công, chờ GVCN duyệt!', 'success');
      setFormData(prev => ({ ...prev, content: '' }));
      discardRecording();
      fetchData();
    } catch (e) {
      showToast('Lỗi: ' + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container fade-up">
      <div className="page-header">
        <h2 className="page-title">Sổ Đầu Bài / Báo cáo lớp</h2>
        <p className="page-sub">Báo cáo tình hình học tập, BTVN, Điểm số bằng tin nhắn hoặc thu âm</p>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">Gửi báo cáo mới</div>
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Lớp học</label>
                <select 
                  className="form-select"
                  value={formData.classId}
                  onChange={e => setFormData({ ...formData, classId: e.target.value })}
                  required
                >
                  {classes.map(c => <option key={c.ClassID} value={c.ClassID}>{c.ClassName} ({c.Subject})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Loại báo cáo</label>
                <select 
                  className="form-select"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="BTVN">Bài tập về nhà (BTVN)</option>
                  <option value="ĐIỂM KTTX">Điểm kiểm tra thường xuyên</option>
                  <option value="THÔNG BÁO KTTX">Thông báo lịch Kiểm tra</option>
                  <option value="NHẬN XÉT">Nhận xét chung</option>
                </select>
              </div>
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nội dung tin nhắn</label>
              <textarea 
                className="form-control"
                rows={4}
                placeholder="Nhập nội dung thông báo, kết quả kiểm tra hoặc BTVN..."
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                style={{ resize: 'vertical', minHeight: '100px' }}
              ></textarea>
            </div>
            
            <div style={{ background: 'var(--surface-50)', padding: '20px', borderRadius: '12px', border: '2px dashed var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="form-label" style={{ marginBottom: 0, color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎙️ Ghi âm (Voice Note)
              </label>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gửi nhanh báo cáo bằng giọng nói thay vì gõ văn bản.</p>
              
              {!isRecording && !audioBlob && (
                <button type="button" className="btn btn-secondary" onClick={startRecording} style={{ alignSelf: 'flex-start', padding: '10px 20px' }}>
                  🎤 Bắt đầu ghi âm
                </button>
              )}
              
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'white', padding: '12px 20px', borderRadius: '8px', border: '1px solid #fee2e2', width: 'max-content' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}></div>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>Đang ghi âm...</span>
                  <button type="button" className="btn btn-danger" onClick={stopRecording}>
                    ⏹ Dừng lại
                  </button>
                </div>
              )}
              
              {audioBlob && !isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'white', padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <audio src={audioUrl} controls style={{ height: 40, flex: 1, minWidth: '250px' }}></audio>
                  <button type="button" className="btn btn-ghost" onClick={discardRecording} style={{ color: 'var(--danger)' }}>
                    🗑 Xóa thu âm
                  </button>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '12px 28px', fontSize: '1rem', borderRadius: '30px', boxShadow: 'var(--shadow)' }}>
                {isSubmitting ? 'Đang gửi...' : 'Gửi báo cáo cho GVCN duyệt'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">Lịch sử báo cáo đã gửi</div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Đang tải lịch sử...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>Chưa có báo cáo nào</h3>
              <p>Bạn chưa gửi báo cáo nào cho lớp học này.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Lớp</th>
                    <th>Loại</th>
                    <th>Nội dung</th>
                    <th>Audio</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)' }}>{fmtDate(r.Date)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{r.ClassName}</td>
                      <td>
                        <span className="badge badge-info">
                          {r.Type}
                        </span>
                      </td>
                      <td style={{ maxWidth: 300 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {r.Content || '-'}
                        </div>
                      </td>
                      <td>
                        {r.AudioUrl ? (
                          <a href={r.AudioUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex' }}>
                            🎙️ Nghe
                          </a>
                        ) : <span style={{ color: 'var(--text-lighter)' }}>-</span>}
                      </td>
                      <td>
                        <span className={`badge ${r.Status === 'APPROVED' ? 'badge-success' : r.Status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                          {r.Status === 'APPROVED' ? 'Đã duyệt' : r.Status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
