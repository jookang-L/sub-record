
import React, { useState, useEffect } from 'react';
import { Copy, Check, FileOutput, ArrowLeft, Wand2, Loader2 } from 'lucide-react';
import { GeneratedResult } from '../types';
import { checkSpelling } from '../services/geminiService';

interface OutputDisplayProps {
  result: GeneratedResult | null;
  apiKey: string | null;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ result, apiKey }) => {
  const [activeTab, setActiveTab] = useState<keyof GeneratedResult>('gradeVersion');
  const [copiedAI, setCopiedAI] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);

  // Local state to handle corrected text
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const [userEditedContent, setUserEditedContent] = useState<string>('');
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);

  // Resizer state
  const [topHeight, setTopHeight] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (result) {
      setActiveTab('gradeVersion');
      setDisplayedContent(result['gradeVersion']);
      setUserEditedContent(result['gradeVersion']);
    }
  }, [result]);

  useEffect(() => {
    if (result) {
      setDisplayedContent(result[activeTab]);
      setUserEditedContent(result[activeTab]);
    }
  }, [activeTab, result]);

  // Handle mouse drag for resizing
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const container = document.getElementById('resizable-container');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const newTopHeight = ((e.clientY - rect.top) / rect.height) * 100;

    // Limit between 20% and 80%
    if (newTopHeight >= 20 && newTopHeight <= 80) {
      setTopHeight(newTopHeight);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove as any);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleSpellCheck = async () => {
    if (!userEditedContent) return;
    if (!apiKey) {
      alert("API 키가 설정되지 않았습니다. 왼쪽 상단의 열쇠 아이콘을 눌러 키를 설정해주세요.");
      return;
    }

    setIsCheckingSpelling(true);
    try {
      const corrected = await checkSpelling(userEditedContent, apiKey);
      setUserEditedContent(corrected);
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
          중앙의 <span className="font-bold text-blue-500 inline-flex items-center gap-1"><ArrowLeft size={14} /> 파란색 화살표 버튼</span>을 눌러주세요.
        </p>
      </div>
    );
  }

  const aiCharCount = displayedContent.replace(/\s/g, '').length;
  const aiCharCountWithSpace = displayedContent.length;

  const userCharCount = userEditedContent.replace(/\s/g, '').length;
  const userCharCountWithSpace = userEditedContent.length;

  const handleCopyAI = () => {
    navigator.clipboard.writeText(displayedContent);
    setCopiedAI(true);
    setTimeout(() => setCopiedAI(false), 2000);
  };

  const handleCopyUser = () => {
    navigator.clipboard.writeText(userEditedContent);
    setCopiedUser(true);
    setTimeout(() => setCopiedUser(false), 2000);
  };

  const tabs: { key: keyof GeneratedResult; label: string }[] = [
    { key: 'gradeVersion', label: '등급 맞춤' },
    ...(result?.summary500 ? [{ key: 'summary500' as keyof GeneratedResult, label: '500자' }] : []),
    ...(result?.summary300 ? [{ key: 'summary300' as keyof GeneratedResult, label: '300자' }] : []),
    ...(result?.summary150 ? [{ key: 'summary150' as keyof GeneratedResult, label: '150자' }] : []),
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
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" id="resizable-container">
        {/* AI Generated Content (Top Section - Read Only) */}
        <div className="flex flex-col border-b-2 border-slate-200" style={{ height: `${topHeight}%` }}>
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide">AI 생성 결과</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="prose prose-slate max-w-none text-slate-800 leading-7 whitespace-pre-wrap font-sans text-sm">
              {displayedContent}
            </div>
          </div>
          <div className="px-4 py-2 border-t border-slate-200 bg-white flex justify-between items-center">
            <div className="text-xs text-slate-500 font-mono">
              <span className={`font-semibold ${aiCharCountWithSpace > 750 ? 'text-red-500' : 'text-slate-700'}`}>{aiCharCountWithSpace}자</span> (공백포함) &middot;
              <span className="ml-1">{aiCharCount}자</span> (공백제외)
            </div>
            <button
              onClick={handleCopyAI}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${copiedAI
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
            >
              {copiedAI ? <Check size={14} /> : <Copy size={14} />}
              {copiedAI ? '복사완료' : '복사'}
            </button>
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`h-2 bg-slate-300 hover:bg-blue-400 cursor-row-resize flex items-center justify-center transition-colors ${isDragging ? 'bg-blue-500' : ''}`}
          style={{ userSelect: 'none' }}
        >
          <div className="w-12 h-1 bg-slate-400 rounded-full"></div>
        </div>

        {/* User Editable Content (Bottom Section) */}
        <div className="flex flex-col" style={{ height: `${100 - topHeight}%` }}>
          <div className="px-4 py-2 bg-green-50 border-b border-green-100">
            <h3 className="text-xs font-bold text-green-700 uppercase tracking-wide">편집 가능 영역</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            <textarea
              value={userEditedContent}
              onChange={(e) => setUserEditedContent(e.target.value)}
              className="w-full h-full resize-none text-slate-800 leading-7 whitespace-pre-wrap font-sans text-sm border-none focus:outline-none focus:ring-0"
              placeholder="여기서 AI 생성 결과를 자유롭게 편집할 수 있습니다..."
            />
          </div>
          <div className="px-4 py-2 border-t border-slate-200 bg-white flex justify-between items-center">
            <div className="text-xs text-slate-500 font-mono">
              <span className={`font-semibold ${userCharCountWithSpace > 750 ? 'text-red-500' : 'text-slate-700'}`}>{userCharCountWithSpace}자</span> (공백포함) &middot;
              <span className="ml-1">{userCharCount}자</span> (공백제외)
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSpellCheck}
                disabled={isCheckingSpelling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-purple-50 hover:text-purple-600 transition-colors border border-slate-300 hover:border-purple-200"
              >
                {isCheckingSpelling ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isCheckingSpelling ? '검사 중...' : '맞춤법 검사'}
              </button>
              <button
                onClick={handleCopyUser}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${copiedUser
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
              >
                {copiedUser ? <Check size={14} /> : <Copy size={14} />}
                {copiedUser ? '복사완료' : '복사'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputDisplay;
