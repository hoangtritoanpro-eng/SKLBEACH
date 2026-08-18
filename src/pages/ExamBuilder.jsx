import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Save, Settings, Grid, FileCheck } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function ExamBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1 State
  const [startWeek, setStartWeek] = useState(19);
  const [endWeek, setEndWeek] = useState(25);
  const [examName, setExamName] = useState('Đề kiểm tra Giữa HK2 - Toán 9');
  
  // Step 2 State
  const [ppctList, setPpctList] = useState([]);
  const [matrixConfig, setMatrixConfig] = useState({}); // { ppctId_level_type: count }
  
  // Step 3 State
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  // Fetch PPCT for Step 2
  const handleNextToStep2 = async () => {
    if (!examName) return toast.error('Vui lòng nhập tên đề thi');
    try {
      setLoading(true);
      const res = await api('getPPCT', { startWeek, endWeek }, user.email);
      setPpctList(res || []);
      setStep(2);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMatrixChange = (id, level, type, val) => {
    const num = parseInt(val) || 0;
    setMatrixConfig(prev => ({
      ...prev,
      [`${id}_${level}_${type}`]: num
    }));
  };

  // Generate Questions for Step 3
  const handleGenerateExam = async () => {
    // Flatten matrixConfig into array
    const configArray = [];
    Object.keys(matrixConfig).forEach(key => {
      const count = matrixConfig[key];
      if (count > 0) {
        const [ppctId, level, type] = key.split('_');
        configArray.push({ ppctId, level, type, count });
      }
    });

    if (configArray.length === 0) return toast.error('Vui lòng phân bổ ít nhất 1 câu hỏi');

    try {
      setLoading(true);
      const res = await api('getQuestionsByMatrix', { matrixConfig: configArray }, user.email);
      setGeneratedQuestions(res || []);
      setStep(3);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExam = async () => {
    try {
      setLoading(true);
      const configArray = Object.keys(matrixConfig)
        .filter(k => matrixConfig[k] > 0)
        .map(k => {
          const [ppctId, level, type] = k.split('_');
          return { ppctId, level, type, count: matrixConfig[k] };
        });

      await api('saveExam', {
        name: examName,
        matrixConfig: configArray,
        generatedQuestions: generatedQuestions.map(q => q.QID)
      }, user.email);

      toast.success('Lưu đề thi thành công!');
      navigate('/exams');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <div>
          <button className="btn btn-sm" style={{ marginBottom: 8, background: 'var(--surface)' }} onClick={() => navigate('/exams')}>
            <ArrowLeft size={14} style={{ marginRight: 4 }} /> Quay lại
          </button>
          <h1 className="page-title">Tạo Đề Thi Tự Động</h1>
        </div>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, padding: '20px', background: 'var(--surface)', borderRadius: 12 }}>
        <div style={{ flex: 1, textAlign: 'center', color: step >= 1 ? 'var(--primary)' : 'var(--text-light)', fontWeight: step >= 1 ? 600 : 400 }}>
          <Settings size={24} style={{ marginBottom: 8 }} /><br />1. Cấu hình
        </div>
        <div style={{ flex: 1, textAlign: 'center', color: step >= 2 ? 'var(--primary)' : 'var(--text-light)', fontWeight: step >= 2 ? 600 : 400 }}>
          <Grid size={24} style={{ marginBottom: 8 }} /><br />2. Phân bổ Ma trận
        </div>
        <div style={{ flex: 1, textAlign: 'center', color: step >= 3 ? 'var(--primary)' : 'var(--text-light)', fontWeight: step >= 3 ? 600 : 400 }}>
          <FileCheck size={24} style={{ marginBottom: 8 }} /><br />3. Xuất bản
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        {step === 1 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: 20 }}>Bước 1: Chọn phạm vi kiến thức</h3>
            <div className="form-group">
              <label>Tên Đề Thi</label>
              <input type="text" className="input" value={examName} onChange={e => setExamName(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Từ Tuần</label>
                <input type="number" className="input" value={startWeek} onChange={e => setStartWeek(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Đến Tuần</label>
                <input type="number" className="input" value={endWeek} onChange={e => setEndWeek(e.target.value)} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-primary" onClick={handleNextToStep2} disabled={loading}>
                Tiếp tục <ArrowRight size={18} style={{ marginLeft: 6 }} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: 20 }}>Bước 2: Phân bổ câu hỏi theo Ma Trận</h3>
            <div className="table-responsive">
              <table className="table" style={{ border: '1px solid var(--border)' }}>
                <thead style={{ background: 'var(--surface-hover)' }}>
                  <tr>
                    <th rowSpan={2} style={{ borderRight: '1px solid var(--border)', minWidth: 300 }}>Chủ đề / YCCĐ</th>
                    <th colSpan={4} style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>Trắc Nghiệm (Câu)</th>
                    <th colSpan={4} style={{ textAlign: 'center' }}>Tự Luận (Câu)</th>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'center', fontSize: '0.85rem' }}>NB</th>
                    <th style={{ textAlign: 'center', fontSize: '0.85rem' }}>TH</th>
                    <th style={{ textAlign: 'center', fontSize: '0.85rem' }}>VD</th>
                    <th style={{ textAlign: 'center', borderRight: '1px solid var(--border)', fontSize: '0.85rem' }}>VDC</th>
                    <th style={{ textAlign: 'center', fontSize: '0.85rem' }}>NB</th>
                    <th style={{ textAlign: 'center', fontSize: '0.85rem' }}>TH</th>
                    <th style={{ textAlign: 'center', fontSize: '0.85rem' }}>VD</th>
                    <th style={{ textAlign: 'center', fontSize: '0.85rem' }}>VDC</th>
                  </tr>
                </thead>
                <tbody>
                  {ppctList.map(item => (
                    <tr key={item.ID}>
                      <td style={{ borderRight: '1px solid var(--border)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.Bai}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 4 }}>{item.YeuCauCanDat}</div>
                      </td>
                      {['TN', 'TL'].map(type => (
                        ['NB', 'TH', 'VD', 'VDC'].map(level => {
                          const key = `${item.ID}_${level}_${type}`;
                          return (
                            <td key={key} style={{ padding: 4, textAlign: 'center', borderRight: level === 'VDC' && type === 'TN' ? '1px solid var(--border)' : 'none' }}>
                              <input 
                                type="number" 
                                min="0"
                                className="input" 
                                style={{ width: 50, textAlign: 'center', padding: '4px 8px' }}
                                value={matrixConfig[key] || ''}
                                onChange={e => handleMatrixChange(item.ID, level, type, e.target.value)}
                              />
                            </td>
                          );
                        })
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn" onClick={() => setStep(1)} disabled={loading}>
                <ArrowLeft size={18} style={{ marginRight: 6 }} /> Quay lại
              </button>
              <button className="btn btn-primary" onClick={handleGenerateExam} disabled={loading}>
                {loading ? 'Đang sinh đề...' : 'Sinh Đề Tự Động'} <ArrowRight size={18} style={{ marginLeft: 6 }} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in">
            <h3 style={{ marginBottom: 20 }}>Bước 3: Xem trước và Xuất bản</h3>
            
            {generatedQuestions.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                Không tìm thấy đủ câu hỏi trong Ngân hàng thỏa mãn Ma trận vừa tạo. <br/>Vui lòng điều chỉnh lại Ma trận.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {generatedQuestions.map((q, idx) => (
                  <div key={idx} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <strong>Câu {idx + 1} ({q.Type} - {q.Level})</strong>
                      <span className="badge" style={{ fontSize: '0.75rem' }}>{q.QID}</span>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: q.Content }} style={{ marginBottom: 12 }}></div>
                    {q.Type === 'TN' && q.Options && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {(() => {
                          try {
                            const ops = JSON.parse(q.Options);
                            return Object.keys(ops).map(k => (
                              <div key={k} style={{ padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 4, display: 'flex', gap: 8 }}>
                                <strong>{k}.</strong> <span>{ops[k]}</span>
                              </div>
                            ));
                          } catch(e) { return <div>Lỗi parse Options</div> }
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn" onClick={() => setStep(2)} disabled={loading}>
                <ArrowLeft size={18} style={{ marginRight: 6 }} /> Chỉnh sửa Ma trận
              </button>
              <button className="btn btn-primary" onClick={handleSaveExam} disabled={loading || generatedQuestions.length === 0}>
                <Save size={18} style={{ marginRight: 6 }} /> Lưu Đề Thi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
