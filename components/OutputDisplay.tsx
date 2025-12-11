
import React, { useState, useEffect } from 'react';
import { Copy, Check, FileOutput, ArrowLeft, Wand2, Loader2, History, Clock } from 'lucide-react';
import { GeneratedResult, HistoryItem } from '../types';
import { checkSpelling } from '../services/geminiService';
import HistorySidebar from './HistorySidebar';
import { neisByteLength } from '../utils/byteCalculator';

interface OutputDisplayProps {
  result: GeneratedResult | null;
  apiKey: string | null;
  historyItems?: HistoryItem[];
  onRestore?: (item: HistoryItem) => void;
  onDeleteHistory?: (id: string) => void;
  onUpdateHistory?: (updates: Partial<GeneratedResult>) => void;
}

const OutputDisplay: React.FC<OutputDisplayProps> = ({ result, apiKey, historyItems = [], onRestore, onDeleteHistory, onUpdateHistory }) => {
  const [activeTab, setActiveTab] = useState<keyof GeneratedResult>('gradeVersion');
  const [copiedAI, setCopiedAI] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Local state to handle corrected text
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const [userEditedContent, setUserEditedContent] = useState<string>('');
  const [isCheckingSpelling, setIsCheckingSpelling] = useState(false);

  // Check if current user content is different from original result content
  const hasChanges = result && userEditedContent !== result[activeTab];

  const handleSaveChanges = () => {
    if (onUpdateHistory && result) {
      onUpdateHistory({ [activeTab]: userEditedContent });
      // Should also update local displayed content to reflect "saved" state if needed
      // But strict props means result update will trigger useEffect. 
      // We might need to handle this carefully to avoid overwriting user edits if we are not careful
      // Actually, simply updating parent history will eventually update 'result' prop if parent handles it correctly.
      alert("수정사항이 히스토리에 저장되었습니다.");
    }
  };

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
      <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-l border-slate-200 bg-slate-50/50 relative">
        {/* History Toggle Button for Empty State */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-6 right-6 bg-gradient-to-br from-red-500 to-rose-600 shadow-lg hover:shadow-xl p-3 rounded-full text-white opacity-30 hover:opacity-100 hover:scale-110 transition-all duration-200 z-40 group"
          title="생성 기록"
        >
          <Clock size={20} />
          {/* 호버 툴팁 */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-slate-800 text-white text-xs px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-50">
            이전 기록을 확인 할 수 있습니다.
            <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[4px] border-l-slate-800"></div>
          </div>
        </button>

        <div className="bg-slate-100 p-6 rounded-full mb-6">
          <FileOutput size={48} className="opacity-40 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-slate-600 mb-2">결과가 여기에 표시됩니다</h3>
        <p className="text-center text-sm max-w-md leading-relaxed">
          왼쪽에서 보고서와 코드 파일을 업로드한 후,<br />
          중앙의 <span className="font-bold text-blue-500 inline-flex items-center gap-1"><ArrowLeft size={14} /> 파란색 화살표 버튼</span>을 눌러주세요.
        </p>

        {/* Sidebar Component */}
        <HistorySidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          historyItems={historyItems}
          onRestore={onRestore || (() => { })}
          onDelete={onDeleteHistory || (() => { })}
        />
      </div>
    );
  }

  const BYTE_WARNING_LIMIT = 1500;

  // 글자 수 및 바이트 계산
  const aiCharCount = displayedContent.replace(/\s/g, '').length;
  const aiCharCountWithSpace = displayedContent.length;
  const aiByteCount = neisByteLength(displayedContent);
  const aiByteCountNoSpace = neisByteLength(displayedContent.replace(/\s/g, ''));

  const userCharCount = userEditedContent.replace(/\s/g, '').length;
  const userCharCountWithSpace = userEditedContent.length;
  const userByteCount = neisByteLength(userEditedContent);
  const userByteCountNoSpace = neisByteLength(userEditedContent.replace(/\s/g, ''));

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
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-2xl z-30 relative group/container">
      {/* History Sidebar */}
      <HistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        historyItems={historyItems}
        onRestore={onRestore || (() => { })}
        onDelete={onDeleteHistory || (() => { })}
      />

      {/* Toggle Button (When content exists) */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="absolute top-14 right-6 bg-gradient-to-br from-red-500 to-rose-600 shadow-lg hover:shadow-xl p-3 rounded-full text-white opacity-30 hover:opacity-100 hover:scale-110 transition-all duration-200 z-50 group"
        title="생성 기록"
      >
        <Clock size={20} />
        {historyItems.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-300 border-2 border-white"></span>
          </span>
        )}
        {/* 호버 툴팁 */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 bg-slate-800 text-white text-xs px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg z-50">
          이전 기록을 확인 할 수 있습니다.
          <div className="absolute top-1/2 right-[-4px] -translate-y-1/2 border-y-[4px] border-y-transparent border-l-[4px] border-l-slate-800"></div>
        </div>
      </button>

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
              <span className={`font-semibold ${aiByteCount > BYTE_WARNING_LIMIT ? 'text-red-500' : 'text-slate-700'}`}>{aiByteCount}byte</span> (공백 포함) &middot;
              <span className="ml-1">{aiByteCountNoSpace}byte</span> (공백 제외) &middot;
              <span className="ml-1">{aiCharCountWithSpace}자</span> (공백 포함) &middot;
              <span className="ml-1">{aiCharCount}자</span> (공백 제외)
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
              <span className={`font-semibold ${userByteCount > BYTE_WARNING_LIMIT ? 'text-red-500' : 'text-slate-700'}`}>{userByteCount}byte</span> (공백 포함) &middot;
              <span className="ml-1">{userByteCountNoSpace}byte</span> (공백 제외) &middot;
              <span className="ml-1">{userCharCountWithSpace}자</span> (공백 포함) &middot;
              <span className="ml-1">{userCharCount}자</span> (공백 제외)
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

              {/* Save Changes Button */}
              {onUpdateHistory && hasChanges && (
                <button
                  onClick={handleSaveChanges}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-sm animate-in fade-in"
                >
                  <Check size={14} />
                  수정사항 저장
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputDisplay;
