'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AssetIcon } from '@/components/AssetIcon';
import { cn } from '@/lib/utils';

interface AssetFilterComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function AssetFilterCombobox({
  value,
  onValueChange,
  options,
  placeholder = 'Todos os assets',
  className,
}: AssetFilterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? options.filter((a) => a.toLowerCase().includes(search.toLowerCase().trim()))
    : options;

  const displayValue = value === 'all' ? '' : value;
  const inputValue = open ? search : displayValue;

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 min-w-[165px] items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm shadow-xs transition-colors focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring"
      >
        {value !== 'all' && (
          <AssetIcon symbol={value} size={18} className="shrink-0" />
        )}
        <Input
          value={inputValue}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={value === 'all' ? placeholder : ''}
          className="h-auto min-w-0 flex-1 border-0 bg-transparent dark:bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={open ? 'Fechar' : 'Abrir'}
        >
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-56 w-full min-w-[165px] overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-md"
        >
          <button
            type="button"
            role="option"
            onClick={() => {
              onValueChange('all');
              setOpen(false);
            }}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
              value === 'all' && 'bg-accent/50'
            )}
          >
            {placeholder}
          </button>
          {filtered.map((asset) => (
            <button
              key={asset}
              type="button"
              role="option"
              onClick={() => {
                onValueChange(asset);
                setOpen(false);
              }}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                value === asset && 'bg-accent/50'
              )}
            >
              <AssetIcon symbol={asset} size={18} className="shrink-0" />
              <span>{asset}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum asset encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
