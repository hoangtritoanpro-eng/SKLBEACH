import { useState, useEffect, useMemo } from 'react';
import { api, formatDateTime } from '../../api';
import { Folder, FileText, Download, ChevronRight, UploadCloud } from 'lucide-react';

export default function PublicLibrary() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    setLoading(true);
    try {
      const data = await api('getLibrary', { public: true });
      setDocs(data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

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
        <div className="file-card-uploader"><UploadCloud size={14} /> {doc.UploadedBy}</div>
        <span>{formatDateTime(doc.Date)}</span>
      </div>
      <div className="file-card-footer">
        <div className="file-card-path"><Folder size={12} fill="#fbbf24" color="#fbbf24" /><span>Thư Viện / {doc.Category}</span></div>
        <a href={doc.FileUrl} target="_blank" rel="noopener noreferrer" className="btn-download" onClick={e => e.stopPropagation()}>
          Tải xuống <Download size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} />
        </a>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header" style={{ background: 'var(--gradient)', color: 'white' }}>
        📚 Thư viện tài liệu
      </div>
      <div className="card-body">
        {loading && <div className="loading-state"><div className="spinner" /></div>}
        {error && <div className="login-error">{error}</div>}
        
        {!loading && !error && (
          <>
            <div className="library-search-wrap" style={{ marginBottom: '16px' }}>
              <input 
                type="text" 
                className="library-search-input" 
                placeholder="Tìm tài liệu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '8px 16px 8px 36px', backgroundSize: '16px' }}
              />
            </div>

            {!searchQuery && !currentFolder && (
              <div className="folder-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginBottom: 0 }}>
                {categories.length === 0 && <div className="empty-state">Chưa có tài liệu</div>}
                {categories.map(cat => (
                  <div key={cat.name} className="folder-card" onClick={() => setCurrentFolder(cat.name)} style={{ padding: '16px 8px' }}>
                    <div className="folder-icon" style={{ fontSize: '3rem', marginBottom: '8px' }}>📁</div>
                    <div className="folder-name" style={{ fontSize: '0.85rem' }}>{cat.name.toUpperCase()}</div>
                    <div className="folder-count" style={{ fontSize: '0.7rem' }}><FileText size={12} /> {cat.count}</div>
                  </div>
                ))}
              </div>
            )}

            {(searchQuery || currentFolder) && (
              <div>
                <div className="breadcrumb" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                  <span className="active" onClick={() => { setCurrentFolder(null); setSearchQuery(''); }}>Thư Viện</span>
                  {currentFolder && !searchQuery && <><ChevronRight size={16} /><span>{currentFolder.toUpperCase()}</span></>}
                  {searchQuery && <><ChevronRight size={16} /><span>Tìm kiếm: "{searchQuery}"</span></>}
                </div>
                {displayedDocs.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px' }}>Không có tài liệu</div>
                ) : (
                  <div className="file-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                    {displayedDocs.map(renderFileCard)}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
