
import React, { useState, useEffect } from 'react';
import { ArrowRight, AlertCircle, Loader2, Key, Info, ChevronDown, Sparkles } from 'lucide-react';
import FileUpload from './components/FileUpload';
import OutputDisplay from './components/OutputDisplay';
import ApiKeyInput from './components/ApiKeyInput';
import { UploadedFile, GradeLevel, GeneratedResult, RecordType } from './types';
import { GRADE_DESCRIPTIONS } from './constants';
import { generateStudentReport } from './services/geminiService';
import { useHistory } from './hooks/useHistory';

const ClubApp: React.FC = () => {
  // State
  const [reportFiles, setReportFiles] = useState<UploadedFile[]>([]);
  const [codeFiles, setCodeFiles] = useState<UploadedFile[]>([]);
  const [draftText, setDraftText] = useState<string>('');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(GradeLevel.GRADE_2);

  // Knowledge Base State
  // Knowledge Base State
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<UploadedFile[]>([]);
  const [customSubjectName, setCustomSubjectName] = useState<string | null>(null);

  // Custom Instructions State
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // History Hook (Club specific)
  const { history, addToHistory, updateHistoryItem, removeFromHistory } = useHistory('history_club');
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

  // Debug: Log history on mount and changes
  useEffect(() => {
    console.log('[동아리 App] 마운트됨, history 개수:', history.length);
    console.log('[동아리 App] localStorage 확인:', localStorage.getItem('history_club'));
  }, []);

  useEffect(() => {
    console.log('[동아리 App] history 변경됨:', history.length, '개');
  }, [history]);

  // Load API Key and Knowledge Base from localStorage

  // Load API Key and Knowledge Base from localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    }

    const storedKbFiles = localStorage.getItem('club_knowledge_base_files');
    const storedSubjectName = localStorage.getItem('club_custom_subject_name');
    const storedInstructions = localStorage.getItem('club_custom_instructions');

    if (storedKbFiles) {
      try {
        setKnowledgeBaseFiles(JSON.parse(storedKbFiles));
      } catch (e) {
        console.error("Failed to parse stored KB files", e);
      }
    } else {
      // Migration
      const storedKbContent = localStorage.getItem('club_knowledge_base_content');
      const storedKbName = localStorage.getItem('club_knowledge_base_name');
      const storedKbMime = localStorage.getItem('club_knowledge_base_mime');

      if (storedKbContent) {
        const legacyFile: UploadedFile = {
          name: storedKbName || '사용자 정의 지식 베이스',
          type: storedKbMime || 'application/pdf',
          data: storedKbContent,
          category: 'knowledge'
        };
        setKnowledgeBaseFiles([legacyFile]);
        localStorage.setItem('club_knowledge_base_files', JSON.stringify([legacyFile]));
      }
    }

    if (storedSubjectName) {
      setCustomSubjectName(storedSubjectName);
    }

    if (storedInstructions) {
      setCustomInstructions(storedInstructions);
    }
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  const handleKnowledgeBaseUpload = (files: UploadedFile[]) => {
    setKnowledgeBaseFiles(files);
    localStorage.setItem('club_knowledge_base_files', JSON.stringify(files));
  };

  const handleResetKnowledgeBase = () => {
    setKnowledgeBaseFiles([]);
    setCustomSubjectName(null);

    localStorage.removeItem('club_knowledge_base_files');
    localStorage.removeItem('club_custom_subject_name');

    localStorage.removeItem('club_knowledge_base_content');
    localStorage.removeItem('club_knowledge_base_name');
    localStorage.removeItem('club_knowledge_base_mime');
  };

  // Handlers
  const handleGenerate = async () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      setError("API 키를 먼저 설정해주세요.");
      return;
    }

    // Validation
    if (reportFiles.length === 0 && codeFiles.length === 0 && !draftText.trim()) {
      setError("최소한 하나 이상의 자료(보고서, 코드, 초안)가 필요합니다.");
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const generatedData = await generateStudentReport({
        reportFiles,
        codeFiles,
        draftText,
        gradeLevel,
        customKnowledgeBase: knowledgeBaseFiles.length > 0 ? knowledgeBaseFiles.map(f => ({
          data: f.data,
          mimeType: f.type
        })) : undefined,
        customSubjectName: customSubjectName || undefined,
        customInstructions: customInstructions || undefined,
        recordType: RecordType.CLUB
      }, apiKey);
      setResult(generatedData);

      // Add to History
      const newId = addToHistory(generatedData, customSubjectName || `동아리 활동 - ${gradeLevel}`);
      setCurrentHistoryId(newId);
      console.log('[동아리] 히스토리 추가됨:', newId, history.length);
    } catch (e: any) {
      setError(e.message || "생성 중 알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 relative overflow-hidden">
      <ApiKeyInput
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
        savedKey={apiKey}
      />

      {/* Error Message Toast */}
      {error && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg flex items-center gap-2 max-w-[90%] z-[100] animate-[slideDown_0.3s_ease-out]">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto font-bold opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Left Column: Inputs */}
      <div className="relative w-1/3 min-w-[400px] max-w-[500px] h-full flex flex-col border-r border-slate-200 bg-white shadow-xl z-20">
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="https://api.dicebear.com/9.x/lorelei/svg?seed=CuteTeacher&glassesProbability=100"
                  alt="Teacher Profile"
                  className="w-14 h-14 rounded-full border-2 border-slate-100 shadow-md animate-[bounce_3s_infinite]"
                />
                <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 ring-2 ring-white rounded-full"></span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 leading-tight">
                  동아리 도우미
                </h1>
                <p className="text-xs text-slate-600 font-medium mt-1 bg-yellow-100 px-2 py-0.5 rounded-sm inline-block">
                  동아리 활동 도우미 with jook
                </p>
              </div>
            </div>
            {/* API Key Button */}
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="group relative flex items-center gap-1.5 p-2 pr-3 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-full transition-all shadow-sm"
              title="API 키 설정"
            >
              <div className="relative">
                <Key size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                {!apiKey && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-500 group-hover:text-blue-600 transition-colors">API</span>
            </button>
          </header>

          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b-2 border-blue-300 pb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold shadow-md">1</span>
              지식 베이스 설정 (선택)
            </h2>

            <div className="mb-4 bg-white border-l-4 border-blue-500 rounded-lg p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-bold text-blue-700 whitespace-nowrap">
                    인공지능이 학습할 사용자의 자료가 있다면 업로드 필수!
                  </div>
                  <div className="text-xs text-slate-600">
                    현재는 제작자의 파일로 학습되어 있습니다.
                  </div>
                  <div className="text-[11px] text-slate-500">
                    (동아리 활동 우수 사례 기록)
                  </div>
                </div>
              </div>
            </div>

            {knowledgeBaseFiles.length > 0 && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span className="text-sm font-bold text-green-700">
                  {knowledgeBaseFiles.length}개의 지식 베이스 파일이 적용 중입니다.
                </span>
                <button
                  onClick={handleResetKnowledgeBase}
                  className="ml-auto text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  초기화
                </button>
              </div>
            )}

            <FileUpload
              title="지식 베이스 파일"
              category="knowledge"
              accept=".pdf"
              files={knowledgeBaseFiles}
              onFilesChange={handleKnowledgeBaseUpload}
              description={
                <>
                  <span className="text-red-600 font-semibold">PDF파일</span>만 업로드 가능합니다.
                </>
              }
            />
            <p className="text-xs text-slate-400 mt-3">
              💡 업로드 시 브라우저에 저장되어 재방문 시에도 유지됩니다.
            </p>
          </section>

          <section className="mt-8 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b-2 border-orange-300 pb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold shadow-md">2</span>
              자료 업로드
            </h2>

            <FileUpload
              title="학생 보고서"
              category="report"
              accept=".pdf,.doc,.docx,.hwp,image/*,.txt"
              files={reportFiles}
              onFilesChange={setReportFiles}
              description="탐구보고서, 발표자료, 포트폴리오"
            />

            <FileUpload
              title="코드 파일"
              category="code"
              accept=".py,.ipynb,.java,.c,.cpp,.js,.html,.css,.txt"
              files={codeFiles}
              onFilesChange={setCodeFiles}
              description="활동 증빙을 위한 소스 코드 파일"
            />
          </section>


          <section className="mt-8 mb-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b-2 border-green-300 pb-3 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold shadow-md">3</span>
              추가 정보
            </h2>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">동아리 활동 분야 입력 (선택)</label>
              <input
                type="text"
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-shadow placeholder-slate-400"
                placeholder="예: 코딩, 과학탐구, 봉사활동 등"
                value={customSubjectName || ''}
                onChange={(e) => {
                  setCustomSubjectName(e.target.value);
                  if (e.target.value) {
                    localStorage.setItem('club_custom_subject_name', e.target.value);
                  } else {
                    localStorage.removeItem('club_custom_subject_name');
                  }
                }}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">세특 작성에 포함되었으면 하는 내용 (선택)</label>
              <textarea
                className="w-full h-28 p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm transition-shadow placeholder-slate-400"
                placeholder="포함하고 싶은 핵심 키워드를 입력해주세요."
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
              />
            </div>

            {/* Advanced Settings: Custom Instructions */}
            <div className="mb-6">
              <button
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors mb-3 group"
              >
                <Sparkles size={16} className="text-purple-500 group-hover:text-purple-600" />
                <span>AI 작성 지시사항 (고급)</span>
                <ChevronDown 
                  size={16} 
                  className={`transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`}
                />
              </button>
              
              {isAdvancedOpen && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 animate-fade-in">
                  <textarea
                    className="w-full h-24 p-3 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none shadow-sm transition-shadow placeholder-slate-400 bg-white"
                    placeholder="예시:&#10;- 협업 능력을 강조해주세요&#10;- 창의성을 부각해주세요&#10;- 동아리 내 역할을 명확히 해주세요"
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value);
                      localStorage.setItem('club_custom_instructions', e.target.value);
                    }}
                  />
                  <p className="text-xs text-purple-600 mt-2">💡 AI가 세특을 작성할 때 참고할 특별한 요청사항을 입력하세요.</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-sm font-bold text-slate-700">목표 등급 설정</label>
                <div className="relative group">
                  <Info size={16} className="text-slate-400 hover:text-blue-500 cursor-help transition-colors" />
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-slate-800 text-white text-xs px-3 py-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50 w-72">
                    ⚠️ Gemini의 한계로 글자 수가 초과될 수 있습니다.<br />
                    초과 시 우측 하단의 <span className="font-bold text-orange-300">'축약'</span> 버튼을 눌러주세요.
                    <div className="absolute top-1/2 left-[-4px] -translate-y-1/2 border-y-[4px] border-y-transparent border-r-[4px] border-r-slate-800"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {Object.values(GradeLevel).map((grade) => (
                  <div
                    key={grade}
                    onClick={() => setGradeLevel(grade)}
                    className={`relative flex items-center p-3 border rounded-xl cursor-pointer transition-all duration-200 group ${gradeLevel === grade
                      ? 'border-blue-500 bg-blue-50/80 ring-1 ring-blue-500 shadow-md transform scale-[1.01]'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                      }`}
                  >
                    <div className={`flex items-center justify-center w-5 h-5 rounded-full border mr-3 transition-colors ${gradeLevel === grade
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-slate-300 bg-slate-50 group-hover:border-blue-400'
                      }`}>
                      {gradeLevel === grade && (
                        <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`block text-sm font-bold ${gradeLevel === grade ? 'text-blue-900' : 'text-slate-800'}`}>
                          {grade}
                        </span>
                      </div>
                      <span className={`block text-xs mt-1 leading-tight ${gradeLevel === grade ? 'text-blue-700' : 'text-slate-500'}`}>
                        {GRADE_DESCRIPTIONS[grade]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                업로드된 모든 자료는 별도로 저장되지 않습니다.
              </p>
            </div>
          </section>
        </div>

        {/* Floating Action Button (Overlapping) */}
        <div className="absolute top-1/2 -right-10 transform -translate-y-1/2 z-50">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            title={apiKey ? "생기부 생성하기" : "API 키를 먼저 설정해주세요"}
            className={`flex flex-col items-center justify-center w-20 h-20 rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.4)] border-4 border-white transition-all duration-300 ${
              result ? 'opacity-30 hover:opacity-100' : ''
            } ${isGenerating
              ? 'bg-slate-100 cursor-wait scale-95'
              : !apiKey
                ? 'bg-slate-300 cursor-not-allowed grayscale'
                : 'bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:scale-110 hover:shadow-[0_4px_25px_rgba(37,99,235,0.6)] active:scale-95'
              }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin text-blue-500 mb-1" size={24} />
                <span className="text-[10px] font-bold text-blue-600 animate-pulse">생성 중...</span>
              </>
            ) : (
              <>
                <ArrowRight size={32} className={!apiKey ? "opacity-50" : ""} />
                <span className="text-[10px] font-bold mt-1">{apiKey ? "생성" : "키 필요"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Output */}
      <div className="flex-1 h-full bg-slate-50 relative z-10 flex flex-col">
        <OutputDisplay
          result={result}
          apiKey={apiKey}
          historyItems={history}
          onRestore={(item) => {
            setResult(item.result);
            setCurrentHistoryId(item.id);
          }}
          onDeleteHistory={removeFromHistory}
          onUpdateHistory={(updates) => {
            if (currentHistoryId && result) {
              const updatedResult = { ...result, ...updates };
              setResult(updatedResult);
              updateHistoryItem(currentHistoryId, { result: updatedResult });
            }
          }}
        />
      </div>
    </div>
  );
};

export default ClubApp;
