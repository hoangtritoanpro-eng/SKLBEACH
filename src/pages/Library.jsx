import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, formatDateTime } from '../api';
import Modal from '../components/Modal';
import { Folder, Search, FileText, Download, ChevronRight, UploadCloud, Eye } from 'lucide-react';

export default function Library() {
  const { user } = useAuth();
  const toast = useToast();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // New States for Folder UI
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: new Date().toString(), title: '', category: 'Tài liệu học tập', description: '' });

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);
    try {
      const data = await api('getLibrary', {}, user.email);
      setDocs(data || []);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoading(false); }
  }

  async function saveDoc(e) {
    e.preventDefault();
    setSaving(true);
    
    const fileInput = document.getElementById('fileUpload');
    const file = fileInput && fileInput.files[0];

    if (!file) {
      toast('Vui lòng chọn file', 'error');
      setSaving(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
      const base64Data = event.target.result;
      const fileName = file.name;
      const mimeType = file.type;

      (async () => {
        try {
          const res = await api('uploadFile', { base64Data, fileName, mimeType }, user.email);
          await api('addLibraryItem', { ...form, date: new Date().toString(), fileUrl: res.fileUrl }, user.email);
          toast('Đã thêm tài liệu');
          setShowModal(false);
          loadLibrary();
          setForm({ date: new Date().toString(), title: '', category: 'Tài liệu học tập', description: '' });
          if (fileInput) fileInput.value = '';
        } catch (err) {
          toast('Lỗi upload: ' + err.message, 'error');
        } finally {
          setSaving(false);
        }
      })();
    };
    reader.onerror = function() {
      toast('Lỗi đọc file', 'error');
      setSaving(false);
    };
    reader.readAsDataURL(file);
  }

  async function saveFolder(e) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setSavingFolder(true);
    try {
      await api('addLibraryItem', { title: '.folder', category: newFolderName.trim(), fileUrl: '', description: '', date: new Date().toString() }, user.email);
      toast('Đã tạo thư mục');
      setShowFolderModal(false);
      setNewFolderName('');
      loadLibrary();
    } catch (err) {
      toast('Lỗi tạo thư mục: ' + err.message, 'error');
    } finally {
      setSavingFolder(false);
    }
  }

  // Data processing
  const categories = useMemo(() => {
    const cats = {};
    docs.forEach(doc => {
      if (!cats[doc.Category]) cats[doc.Category] = 0;
      if (doc.Title !== '.folder') {
        cats[doc.Category]++;
      }
    });
    return Object.keys(cats).map(name => ({ name, count: cats[name] }));
  }, [docs]);

  const recentDocs = useMemo(() => {
    return [...docs].filter(d => d.Title !== '.folder').sort((a, b) => new Date(b.Date) - new Date(a.Date)).slice(0, 5);
  }, [docs]);

  const displayedDocs = useMemo(() => {
    let filtered = docs.filter(d => d.Title !== '.folder');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return filtered.filter(d => d.Title.toLowerCase().includes(q) || d.Category.toLowerCase().includes(q) || (d.Description && d.Description.toLowerCase().includes(q)));
    }
    if (currentFolder) {
      return filtered.filter(d => d.Category === currentFolder);
    }
    return [];
  }, [docs, currentFolder, searchQuery]);

  const renderFileCard = (doc) => (
    <div key={doc.DocID} className="file-card">
      <div className="file-card-badge">{doc.Category}</div>
      <h4 className="file-card-title">{doc.Title}</h4>
      <p className="file-card-desc">{doc.Description || 'Không có mô tả'}</p>
      
      <div className="file-card-meta">
        <div className="file-card-uploader">
          <UploadCloud size={14} /> {doc.UploadedBy}
        </div>
        <span>{formatDateTime(doc.Date)}</span>
      </div>
      
      <div className="file-card-footer">
        <div className="file-card-path">
          <Folder size={12} fill="#fbbf24" color="#fbbf24" />
          <span>Thư Viện / {doc.Category}</span>
        </div>
        <a href={doc.FileUrl} target="_blank" rel="noopener noreferrer" className="btn-download" onClick={e => e.stopPropagation()}>
          Tải ngay <Download size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
        </a>
      </div>
    </div>
  );

  return (
    <div className="fade-up">
      <div className="library-header-actions">
        <div className="library-search-wrap">
          <input 
            type="text" 
            className="library-search-input" 
            placeholder="Nhập tên tài liệu cần tìm kiếm..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {(user.role === 'ADMIN' || user.role === 'TEACHER') && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setShowFolderModal(true)}>+ Tạo thư mục</button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Thêm tài liệu</button>
          </div>
        )}
      </div>

      {loading && <div className="loading-state"><div className="spinner" /><span>Đang tải...</span></div>}

      {!loading && !searchQuery && !currentFolder && (
        <>
          {recentDocs.length > 0 && (
            <div>
              <h2 className="section-title">🔥 Tài Liệu Mới Nhất</h2>
              <div className="recent-docs-scroll">
                {recentDocs.map(renderFileCard)}
              </div>
            </div>
          )}

          <div>
            <h2 className="section-title">📁 Duyệt Theo Thư Mục</h2>
            <div className="breadcrumb">
              <span>Thư Viện Số TOÁN SKYLINE</span>
            </div>
            
            <div className="folder-grid">
              {categories.map(cat => (
                <div key={cat.name} className="folder-card" onClick={() => setCurrentFolder(cat.name)}>
                  <div className="folder-icon">📁</div>
                  <div className="folder-name">{cat.name.toUpperCase()}</div>
                  <div className="folder-count">
                    <FileText size={14} /> {cat.count} tài liệu
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && (searchQuery || currentFolder) && (
        <div>
          <div className="breadcrumb" style={{ marginBottom: '16px' }}>
            <span className="active" onClick={() => { setCurrentFolder(null); setSearchQuery(''); }}>Thư Viện Số TOÁN SKYLINE</span>
            {currentFolder && !searchQuery && (
              <>
                <ChevronRight size={18} />
                <span>{currentFolder.toUpperCase()}</span>
              </>
            )}
            {searchQuery && (
              <>
                <ChevronRight size={18} />
                <span>Kết quả tìm kiếm cho "{searchQuery}"</span>
              </>
            )}
          </div>
          
          {displayedDocs.length === 0 ? (
            <div className="empty-state" style={{ marginTop: '40px' }}>
              <div className="empty-icon">🔍</div>
              <h3>Không tìm thấy tài liệu nào</h3>
              <p>Thử tìm với từ khóa khác hoặc quay lại thư mục gốc.</p>
            </div>
          ) : (
            <div className="file-grid">
              {displayedDocs.map(renderFileCard)}
            </div>
          )}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Thêm Tài Liệu">
        <form onSubmit={saveDoc}>
          <div className="form-group">
            <label className="form-label">Tên tài liệu</label>
            <input className="form-control" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="VD: Giáo trình Tiếng Anh Lớp 10" />
          </div>
          <div className="form-group">
            <label className="form-label">Thư mục (Phân loại)</label>
            <input className="form-control" value={form.category} onChange={e => setForm({...form, category: e.target.value})} required list="categories" placeholder="Chọn hoặc nhập tên thư mục mới..." />
            <datalist id="categories">
              {categories.map(c => <option key={c.name} value={c.name} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label className="form-label">Tài liệu đính kèm (chọn file từ máy tính)</label>
            <input className="form-control" type="file" id="fileUpload" required />
          </div>
          <div className="form-group">
            <label className="form-label">Mô tả ngắn</label>
            <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Mô tả nội dung tài liệu..."></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang tải lên...' : 'Lưu tài liệu'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showFolderModal} onClose={() => setShowFolderModal(false)} title="Tạo Thư Mục Mới">
        <form onSubmit={saveFolder}>
          <div className="form-group">
            <label className="form-label">Tên thư mục</label>
            <input className="form-control" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} required placeholder="VD: Đề thi Toán học kỳ 1" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowFolderModal(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={savingFolder}>{savingFolder ? 'Đang tạo...' : 'Tạo thư mục'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
