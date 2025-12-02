
import React, { useState, useEffect } from 'react';
import { Key, Save, X, Eye, EyeOff, Lock } from 'lucide-react';

interface ApiKeyInputProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  savedKey: string | null;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ isOpen, onClose, onSave, savedKey }) => {
  const [key, setKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKey(savedKey || '');
    }
  }, [isOpen, savedKey]);

  const handleSave = () => {
    if (key.trim()) {
      onSave(key.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Key size={18} className="text-blue-500" />
            API 키 설정
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">
              Google Gemini API 키를 입력해주세요.<br/>
              입력된 키는 <strong>브라우저에만 저장</strong>되며 서버로 전송되지 않습니다.
            </p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock size={16} className="text-slate-400" />
              </div>
              <input
                type={isVisible ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full pl-10 pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-700 font-mono text-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setIsVisible(!isVisible)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-6">
            <p className="text-xs text-blue-700">
              ℹ️ API 키가 없으신가요? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-blue-900">Google AI Studio</a>에서 무료로 발급받을 수 있습니다.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!key.trim()}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-md flex items-center gap-2 transition-all"
            >
              <Save size={16} />
              저장하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyInput;
