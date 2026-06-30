import React, { useState, useRef } from 'react';
import { Upload, File, Image, FileText, X, CheckCircle, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_SIZE_MB = 5;
const ALLOWED = ['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const fileIcon = (type) => {
  if (type?.startsWith('image')) return <Image size={16} className="text-blue-500"/>;
  if (type === 'application/pdf') return <FileText size={16} className="text-red-500"/>;
  return <File size={16} className="text-gray-400"/>;
};

const fmtSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function DocumentUpload({ onUpload, maxFiles = 5, label = 'Attach Evidence' }) {
  const [files, setFiles]     = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (newFiles) => {
    const filtered = Array.from(newFiles).filter(f => {
      if (!ALLOWED.includes(f.type)) { toast.error(`${f.name}: unsupported file type`); return false; }
      if (f.size > MAX_SIZE_MB * 1024 * 1024) { toast.error(`${f.name}: exceeds ${MAX_SIZE_MB}MB limit`); return false; }
      return true;
    });
    if (files.length + filtered.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }
    const withPreview = filtered.map(f => ({
      id: Date.now() + Math.random(),
      file: f, name: f.name, size: f.size, type: f.type,
      preview: f.type.startsWith('image') ? URL.createObjectURL(f) : null,
      status: 'ready',
    }));
    const updated = [...files, ...withPreview];
    setFiles(updated);
    onUpload?.(updated.map(f => f.file));
  };

  const remove = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    toast('File removed');
  };

  const simulateUpload = async () => {
    if (files.length === 0) return toast.error('No files to upload');
    setFiles(prev => prev.map(f => ({ ...f, status:'uploading' })));
    await new Promise(r => setTimeout(r, 1200));
    setFiles(prev => prev.map(f => ({ ...f, status:'uploaded' })));
    toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded successfully`);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          dragging ? 'border-ticano-red bg-ticano-red/5 scale-[1.01]' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-gray-50 dark:bg-gray-800'
        }`}
      >
        <Upload size={22} className={`mx-auto mb-2 ${dragging ? 'text-ticano-red' : 'text-gray-300'}`}/>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
        <p className="text-xs text-gray-400 mt-1">PDF, Word, JPEG, PNG · Max {MAX_SIZE_MB}MB per file</p>
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-500 dark:text-gray-300 hover:bg-gray-50 transition-colors">
          <Paperclip size={12}/> Choose files
        </div>
        <input ref={inputRef} type="file" multiple accept={ALLOWED.join(',')} onChange={e => addFiles(e.target.files)} className="hidden"/>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <div key={f.id} className="flex items-center gap-3 p-3 bg-white dark:bg-ticano-dark-card rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm animate-fade-up">
              {f.preview ? (
                <img src={f.preview} alt={f.name} className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"/>
              ) : (
                <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                  {fileIcon(f.type)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{f.name}</p>
                <p className="text-xs text-gray-400">{fmtSize(f.size)}</p>
              </div>
              {f.status === 'uploading' && <div className="w-4 h-4 border-2 border-ticano-red border-t-transparent rounded-full animate-spin shrink-0"/>}
              {f.status === 'uploaded' && <CheckCircle size={16} className="text-green-500 shrink-0"/>}
              {f.status === 'ready' && (
                <button onClick={() => remove(f.id)} className="p-1 text-gray-300 hover:text-red-400 transition-colors shrink-0"><X size={14}/></button>
              )}
            </div>
          ))}
          {files.some(f => f.status === 'ready') && (
            <button onClick={simulateUpload} className="w-full flex items-center justify-center gap-2 py-2.5 bg-ticano-charcoal text-white rounded-xl text-sm font-medium hover:bg-black transition-colors">
              <Upload size={14}/> Upload {files.filter(f=>f.status==='ready').length} file{files.filter(f=>f.status==='ready').length>1?'s':''}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
