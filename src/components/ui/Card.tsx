import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white rounded-2xl shadow-xl p-8 border border-gray-100',
        'animate-scale-in',
        className
      )}
    >
      {children}
    </div>
  );
}