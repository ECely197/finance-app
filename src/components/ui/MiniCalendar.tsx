import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export const MiniCalendar = ({ selectedDate, onSelect, onClose }: MiniCalendarProps) => {
  const [viewDate, setViewDate] = useState(() => 
    selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date()
  );
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => daysInPrevMonth - firstDayOfMonth + 1 + i);
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const nextMonthDays = Array.from({ length: 42 - (prevMonthDays.length + currentMonthDays.length) }, (_, i) => i + 1);

  const isToday = (d: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (d: number) => {
    if (!selectedDate) return false;
    const sel = new Date(selectedDate + 'T12:00:00');
    return sel.getDate() === d && sel.getMonth() === month && sel.getFullYear() === year;
  };

  const handleDayClick = (day: number, mOffset = 0) => {
    const targetDate = new Date(year, month + mOffset, day, 12);
    onSelect(targetDate.toISOString().slice(0, 10));
  };

  return (
    <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100 w-full max-w-[280px]">
      <div className="flex items-center justify-between mb-4 px-1">
        <h4 className="font-extrabold text-slate-800 text-sm">
          {monthNames[month]} <span className="text-slate-400 font-bold">{year}</span>
        </h4>
        <div className="flex gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {daysShort.map(d => (
          <div key={d} className="text-center text-[9px] font-black text-slate-300 uppercase tracking-tighter py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {prevMonthDays.map(d => (
          <button key={`p-${d}`} onClick={() => handleDayClick(d, -1)} className="text-center text-[10px] font-bold text-slate-200 py-1.5 hover:text-slate-400 transition-colors">{d}</button>
        ))}
        {currentMonthDays.map(d => {
          const active = isSelected(d);
          const today = isToday(d);
          return (
            <button 
              key={d} 
              onClick={() => handleDayClick(d)}
              className={`text-center text-[10px] font-bold py-1.5 rounded-xl transition-all relative
                ${active ? 'bg-blue-500 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}
                ${today && !active ? 'text-blue-500 ring-1 ring-blue-500/30' : ''}
              `}
            >
              {d}
              {today && <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full ${active ? 'bg-white' : 'bg-blue-500'}`} />}
            </button>
          );
        })}
        {nextMonthDays.map(d => (
          <button key={`n-${d}`} onClick={() => handleDayClick(d, 1)} className="text-center text-[10px] font-bold text-slate-200 py-1.5 hover:text-slate-400 transition-colors">{d}</button>
        ))}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
        <button onClick={() => onSelect(new Date().toISOString().slice(0, 10))} className="flex-1 py-2 text-[9px] font-black uppercase text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">Hoy</button>
        <button onClick={onClose} className="flex-1 py-2 text-[9px] font-black uppercase text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">Limpiar</button>
      </div>
    </div>
  );
};
