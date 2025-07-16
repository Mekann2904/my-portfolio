import { useEffect, useState } from 'react';

function formatFileSize(size) {
  if (!size) return '';
  const num = Number(size);
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let value = num;
  while (value >= 1024 && idx < units.length - 1) {
    value = value / 1024;
    idx++;
  }
  const display = value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
  return `${display} ${units[idx]}`;
}

export default function DownloadBox({ fileName, fileUrl, description = '' }) {
  const [fileSize, setFileSize] = useState('');

  useEffect(() => {
    async function fetchFileSize() {
      try {
        const res = await fetch(fileUrl, { method: 'HEAD' });
        const size = res.headers.get('content-length');
        setFileSize(formatFileSize(size));
      } catch (e) {
        setFileSize('');
      }
    }
    fetchFileSize();
  }, [fileUrl]);

  return (
    <div className="border border-gray-800 rounded-md p-4 flex items-center gap-4 bg-gray-800 mb-4">
      <span className="text-2xl text-gray-400">
        {/* クリップアイコンSVG */}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l7.07-7.07a4 4 0 00-5.657-5.657l-7.071 7.07a6 6 0 108.485 8.486l6.364-6.364" />
        </svg>
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-200">{fileName}</div>
        {fileSize && <div className="text-xs text-gray-400">{fileSize}</div>}
        {description && <div className="text-xs text-gray-500">{description}</div>}
      </div>
      <a
        href={fileUrl}
        download
        className="inline-flex items-center px-4 py-2 bg-[#6366f1] text-white rounded hover:bg-[#4f46e5] hover:text-white transition"
      >
        {/* ダウンロードアイコンSVG */}
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
        </svg>
        ダウンロード
      </a>
    </div>
  );
} 