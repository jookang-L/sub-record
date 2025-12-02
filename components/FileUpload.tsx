import React, { useRef } from 'react';
import { Upload, X, FileText, FileCode } from 'lucide-react';
import { UploadedFile } from '../types';

interface FileUploadProps {
  title: string;
  accept: string;
  category: 'report' | 'code';
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  description: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  title,
  accept,
  category,
  files,
  onFilesChange,
  description
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: UploadedFile[] = [];
      const fileList: File[] = Array.from(e.target.files);

      fileList.forEach(file => {
        const reader = new FileReader();
        
        // Code files should be read as text to be useful context if they aren't images
        const isCode = category === 'code';
        
        reader.onload = (event) => {
          if (event.target?.result) {
            newFiles.push({
              name: file.name,
              type: file.type || 'text/plain',
              data: event.target.result as string,
              category
            });
            
            if (newFiles.length === fileList.length) {
              onFilesChange([...files, ...newFiles]);
            }
          }
        };

        if (isCode) {
           reader.readAsText(file);
        } else {
           // Reports (PDF/Image) read as DataURL for multimodal
           // Note: Simple text files for reports will be base64 encoded here 
           // but handled in service. Ideally we'd distinguish more strictly.
           reader.readAsDataURL(file);
        }
      });
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  return (
    <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                {category === 'report' ? <FileText size={18} className="text-blue-500" /> : <FileCode size={18} className="text-green-500" />}
                {title}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded flex items-center gap-1 transition-colors"
        >
          <Upload size={14} />
          추가
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple
        className="hidden"
      />

      {files.length > 0 ? (
        <ul className="space-y-2 mt-3">
          {files.map((file, idx) => (
            <li key={idx} className="flex justify-between items-center text-sm bg-slate-50 p-2 rounded border border-slate-100">
              <span className="truncate max-w-[200px] text-slate-600" title={file.name}>{file.name}</span>
              <button onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 text-center py-4 border-2 border-dashed border-slate-200 rounded-md text-slate-400 text-sm">
            파일을 업로드해주세요
        </div>
      )}
    </div>
  );
};

export default FileUpload;