
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "ရွေးချယ်ရန်...",
  label,
  required = false,
  disabled = false,
  className = "",
  id
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  // Find selected option object based on value prop
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Reset search on close
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Filter options
  const filteredOptions = options.filter(opt => {
    const search = searchTerm.toLowerCase();
    return (
      opt.label.toLowerCase().includes(search) || 
      (opt.subLabel && opt.subLabel.toLowerCase().includes(search))
    );
  });

  const handleSelect = (opt: Option) => {
    onChange(opt.value);
    setIsOpen(false);
    setSearchTerm('');
    setActiveIndex(-1)
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return
    if (!isOpen && (e.key === 'Enter' || e.key === 'ArrowDown')) {
      setIsOpen(true)
      setActiveIndex(-1)
      return
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }
    if (isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      const max = filteredOptions.length - 1
      if (e.key === 'ArrowDown') setActiveIndex(i => Math.min(max, i + 1))
      if (e.key === 'ArrowUp') setActiveIndex(i => Math.max(0, i - 1))
      return
    }
    if (isOpen && e.key === 'Enter' && activeIndex >= 0) {
      const opt = filteredOptions[activeIndex]
      if (opt) handleSelect(opt)
    }
  }

  return (
    <div id={id} className={`relative ${className}`} ref={wrapperRef} role="combobox" aria-expanded={isOpen} aria-owns="searchable-select-list" aria-controls="searchable-select-list" aria-haspopup="listbox" tabIndex={0} onKeyDown={handleKeyDown} aria-label={label}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-500 mb-1 uppercase">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div 
        className={`
          w-full border rounded-lg px-3 py-2 text-sm flex justify-between items-center cursor-pointer bg-white transition-all
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-300 hover:border-slate-400'}
          ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : ''}
        `}
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (disabled) return
          if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen)
        }}
      >
        <div className="flex-1 truncate mr-2 text-slate-700">
          {selectedOption ? (
            <span>
                <span className="font-medium">{selectedOption.label}</span>
                {selectedOption.subLabel && <span className="text-slate-400 ml-2 text-xs">({selectedOption.subLabel})</span>}
            </span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-fade-in" role="listbox" id="searchable-select-list" ref={listRef}>
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-3 py-1.5 text-sm outline-none focus:border-blue-500"
                    placeholder="ရှာဖွေရန် စာရိုက်ပါ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()} // Prevent closing when clicking input
                />
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center italic">
                No results found.
              </div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                    className={`
                    px-3 py-2 rounded-md text-sm cursor-pointer flex flex-col
                    ${opt.value === value ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}
                    `}
                    role="option"
                    aria-selected={opt.value === value}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleSelect(opt)
                    }}
                >
                  <span className="font-medium">{opt.label}</span>
                  {opt.subLabel && <span className="text-[10px] text-slate-400">{opt.subLabel}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
