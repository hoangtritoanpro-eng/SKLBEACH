const BASE_URL = import.meta.env.VITE_GAS_URL;

export async function api(action, data = {}, userEmail = '') {
  if (!BASE_URL) throw new Error('VITE_GAS_URL chưa được cấu hình trong file .env');
  
  // Use Vercel Proxy in production to bypass Google Multiple Accounts bug.
  // In local dev, hit GAS directly (since Vite doesn't serve the api/ folder).
  const fetchUrl = import.meta.env.DEV ? BASE_URL : '/api/gas';
  
  try {
    const response = await fetch(fetchUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, email: userEmail, ...data }),
    });
    
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error('Dữ liệu trả về bị lỗi (Có thể Google đang chặn do quá tải, vui lòng tải lại trang).');
    }

    if (!json.ok) throw new Error(json.error || 'Lỗi không xác định');
    return json.data;
  } catch (err) {
    throw err;
  }
}

export const fmtCurrency = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtDate = (d) => {
  if (!d) return '';
  
  const str = String(d);
  
  // 1. Nếu là định dạng YYYY-MM-DD
  const parts = str.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, day] = parts;
    return `${day.substring(0, 2)}/${m}/${y}`;
  }
  
  // 2. Thử parse dạng Date string (ví dụ: Mon Jul 13 2026...)
  try {
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) {
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch (e) {
    // bỏ qua lỗi parse
  }
  
  return str;
};

export const today = () => new Date().toISOString().slice(0, 10);

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch (e) {
    return String(dateString);
  }
};
