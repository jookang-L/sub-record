import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomCalendarProps {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({ selectedDate, onDateSelect }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'dates' | 'months'>('dates');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // --- Dates View Logic ---
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 (Sun) - 6 (Sat)

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const handleDateClick = (day: number) => {
        onDateSelect(new Date(year, month, day));
    };

    // --- Months/Years View Logic ---
    const handlePrevYear = () => setCurrentDate(new Date(year - 1, month, 1));
    const handleNextYear = () => setCurrentDate(new Date(year + 1, month, 1));

    const handleMonthSelect = (selectedMonthIndex: number) => {
        setCurrentDate(new Date(year, selectedMonthIndex, 1));
        setViewMode('dates');
    };

    // Render Days
    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="h-7 w-7"></div>);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const isSelected = selectedDate &&
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();

        const dayIndex = (startDayOfWeek + day - 1);
        const isSunday = dayIndex % 7 === 0;
        const isSaturday = dayIndex % 7 === 6;

        let textColor = 'text-slate-700';
        if (isSunday) textColor = 'text-red-500';
        if (isSaturday) textColor = 'text-blue-500';
        if (isSelected) textColor = 'text-white';

        days.push(
            <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors
          ${isSelected
                        ? 'bg-blue-600 font-bold shadow-sm'
                        : 'hover:bg-blue-50'} 
          ${textColor}
        `}
            >
                {day}
            </button>
        );
    }

    const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

    return (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm w-full max-w-[280px] mx-auto">
            {viewMode === 'dates' ? (
                <>
                    <div className="flex items-center justify-between mb-2">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('months')}
                            className="flex flex-col items-center hover:bg-slate-50 px-2 rounded cursor-pointer transition-colors"
                        >
                            <div className="flex items-baseline gap-1 whitespace-nowrap">
                                <span className="text-sm font-bold text-slate-800">{month + 1}월</span>
                                <span className="text-[10px] text-slate-500 font-medium">{year}</span>
                            </div>
                        </button>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-0 text-center mb-1">
                        {weekDays.map((day, idx) => (
                            <div key={day} className={`text-[10px] font-medium ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-slate-400'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-1 place-items-center">
                        {days}
                    </div>
                </>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                        <button onClick={handlePrevYear} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-slate-800">{year}년</span>
                        <button onClick={handleNextYear} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 12 }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => handleMonthSelect(i)}
                                className={`py-2 text-xs rounded-lg transition-colors ${i === month
                                    ? 'bg-blue-500 text-white font-bold shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                {i + 1}월
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setViewMode('dates')}
                        className="w-full mt-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 border-t border-slate-100"
                    >
                        취소
                    </button>
                </>
            )}
        </div>
    );
};

export default CustomCalendar;
