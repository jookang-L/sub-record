import React from 'react';
import { X, Clock, RotateCcw, Trash2, FileText, ChevronRight } from 'lucide-react';
import { HistoryItem, GeneratedResult } from '../types';

interface HistorySidebarProps {
    isOpen: boolean;
    onClose: () => void;
    historyItems: HistoryItem[];
    onRestore: (item: HistoryItem) => void;
    onDelete: (id: string) => void;
    title?: string;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
    isOpen,
    onClose,
    historyItems,
    onRestore,
    onDelete,
    title = "생성 기록"
}) => {

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('ko-KR', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            {/* Overlay (Optional: enable if you want to dim background) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-[60] backdrop-blur-[1px] transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-[200px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header - Simplified */}
                <div className="p-2 border-b border-slate-100 flex items-center justify-end bg-slate-50">
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50/50">
                    {historyItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 p-4">
                            <FileText size={32} className="opacity-20" />
                            <p className="text-xs text-center">아직 생성된<br/>기록이 없습니다.</p>
                        </div>
                    ) : (
                        historyItems.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow group"
                            >
                                <div className="flex justify-between items-start mb-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                        <Clock size={8} />
                                        {formatDate(item.timestamp)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("정말 이 기록을 삭제하시겠습니까?")) {
                                                onDelete(item.id);
                                            }
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
                                        title="삭제"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>

                                <div className="mb-2">
                                    <p className="text-[11px] text-slate-700 line-clamp-2 leading-tight">
                                        {item.summary || item.result.gradeVersion.substring(0, 60) + "..."}
                                    </p>
                                </div>

                                <button
                                    onClick={() => {
                                        onRestore(item);
                                        onClose();
                                    }}
                                    className="w-full flex items-center justify-center gap-1 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[11px] font-bold transition-colors"
                                >
                                    <RotateCcw size={12} />
                                    불러오기
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer info */}
                <div className="p-2 border-t border-slate-100 bg-white text-center">
                    <p className="text-[9px] text-slate-400 leading-tight">
                        브라우저 저장<br/>캐시 삭제 시 초기화
                    </p>
                </div>
            </div>
        </>
    );
};

export default HistorySidebar;
