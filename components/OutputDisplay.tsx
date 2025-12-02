
import React, { useState, useEffect } from 'react';
import { Copy, Check, FileOutput, ArrowLeft, Wand2, Loader2 } from 'lucide-react';
import { GeneratedResult } from '../types';
import { checkSpelling } from '../services/geminiService';

interface OutputDisplayProps {
  result: GeneratedResult | null;
  apiKey: string | null;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ result, apiKey }) => {
  const [activeTab, setActiveTab] = useState<keyof GeneratedResult>('standard');
  const [copied, setCopied] = useState(false);
  
  // Local state to handle corrected text
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);

  useEffect(() => {
    if (result) {
      setActiveTab('gradeVersion');
      setDisplayedContent(result['gradeVersion']);
    }
  }, [result]);

  useEffect(() => {
    if (result) {
      setDisplayedContent(result[activeTab]);
    }
  }, [activeTab, result]);

  const handleSpellCheck = async () => {
    if (!displayedContent) return;
    if (!apiKey) {
        alert("API 키가 설정되지 않았습니다. 왼쪽 상단의 열쇠 아이콘을 눌러 키를 설정해주세요.");
        return;
    }
    
    setIsCheckingSpelling(true);
    try {
      const corrected = await checkSpelling(displayedContent, apiKey);
      setDisplayedContent(corrected);
    } catch (error) {
      console.error("Spell check failed", error);
      alert("맞춤법 검사 중 오류가 발생했습니다.");
    } finally {
      setIsCheckingSpelling(false);
    }
  };

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-l border-slate-200 bg-slate-50/50">
        <div className="bg-slate-100 p-6 rounded-full mb-6">
            <FileOutput size={48} className="opacity-40 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-600 mb-2">결과가 여기에 표시됩니다</h3>
        <p className="text-center text-sm max-w-md leading-relaxed">
            왼쪽에서 보고서와 코드 파일을 업로드한 후,<br />
            중앙의 <span className="font-bold text-blue-500 inline-flex items-center gap-1"><ArrowLeft size={14}/> 파란색 화살표 버튼</span>을 눌러주세요.
        </p>
      </div>
    );
  }

  const charCount = displayedContent.replace(/\s/g, '').length; // No space
  const charCountWithSpace = displayedContent.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { key: keyof GeneratedResult; label: string }[] = [
    { key: 'standard', label: '표준 (700자)' },
    { key: 'gradeVersion', label: '등급 맞춤' },
    { key: 'summary500', label: '500자' },
    { key: 'summary300', label: '300자' },
    { key: 'summary150', label: '150자' },
  ];

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-2xl z-30">
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">생성 결과</h2>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide max-w-[60%]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar for Actions */}
      <div className="px-4 py-2 border-b border-slate-100 bg-white flex justify-end gap-2">
         <button
            onClick={handleSpellCheck}
            disabled={isCheckingSpelling}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors border border-transparent hover:border-blue-100"
         >
            {isCheckingSpelling ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            {isCheckingSpelling ? '검사 중...' : '맞춤법 검사'}
         </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-white">
        <div className="prose prose-slate max-w-none text-slate-800 leading-8 whitespace-pre-wrap font-sans text-base">
          {displayedContent}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <div className="text-xs text-slate-500 font-mono">
            <span className={`font-semibold ${charCountWithSpace > 750 ? 'text-red-500' : 'text-slate-700'}`}>{charCountWithSpace}자</span> (공백포함) &middot; 
            <span className="ml-1">{charCount}자</span> (공백제외)
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
              copied 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? '복사완료' : '결과 복사'}
        </button>
      </div>
    </div>
  );
};

export default OutputDisplay;
