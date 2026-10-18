export const toDateTimeLocalValue = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const formatVietnameseDateTime = (isoOrLocalString?: string): string => {
  if (!isoOrLocalString) return 'Chưa xác định';
  try {
    const d = new Date(isoOrLocalString);
    if (isNaN(d.getTime())) return isoOrLocalString;
    const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = daysOfWeek[d.getDay()];
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return `${timeStr} · ${dayName}, ${dateStr}`;
  } catch {
    return isoOrLocalString;
  }
};

export const getRelativeTimeNotice = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diffMinutes = Math.round((target - now) / 60000);
    if (diffMinutes <= 5 && diffMinutes >= -5) return '⚡ Đi ngay bây giờ';
    if (diffMinutes > 5 && diffMinutes <= 60) return `⏱️ Sau ${diffMinutes} phút nữa`;
    if (diffMinutes > 60 && diffMinutes <= 24 * 60) {
      const hours = Math.round(diffMinutes / 60);
      return `🗓️ Sau ${hours} tiếng nữa`;
    }
    if (diffMinutes > 24 * 60) {
      const days = Math.round(diffMinutes / (24 * 60));
      return `🗓️ Sau ${days} ngày nữa`;
    }
    if (diffMinutes < -5) return '⚠️ Thời gian đã qua';
    return '';
  } catch {
    return '';
  }
};
