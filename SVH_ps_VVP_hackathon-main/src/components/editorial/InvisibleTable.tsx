'use client';

import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

interface InvisibleTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
}

export function InvisibleTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  className = '',
}: InvisibleTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left border-collapse">
        {/* Sticky Uppercase Caption Header */}
        <thead>
          <tr className="sticky top-0 bg-[#FAF9F6] z-10 border-b border-[#E8E4DD]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3.5 px-3 font-editorial-sans text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-[#787878] font-semibold ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Row Items with py-4 gap & subtle gradient hover */}
        <tbody className="divide-y divide-[#E8E4DD]/40">
          {data.map((item, idx) => (
            <tr
              key={item.id ?? idx}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors duration-200 hover:bg-gradient-to-r hover:from-[#C65D3A]/8 hover:via-[#C65D3A]/2 hover:to-transparent cursor-pointer group`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-4 px-3 font-editorial-sans text-xs sm:text-sm text-[#111213] ${
                    col.align === 'right'
                      ? 'text-right font-editorial-mono tabular-nums'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
