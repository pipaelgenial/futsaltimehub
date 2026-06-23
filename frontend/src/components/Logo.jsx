import React from 'react';
import { Timer } from 'lucide-react';

export default function Logo({ size = 'md', linkTo = null }) {
  const sizes = {
    sm: { box: 'w-8 h-8', icon: 16, title: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-10 h-10', icon: 20, title: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-14 h-14', icon: 26, title: 'text-xl', sub: 'text-xs' },
  };
  const s = sizes[size];

  const content = (
    <div className="flex items-center gap-3">
      <div className={`${s.box} bg-neon flex items-center justify-center rounded-sm`}>
        <Timer strokeWidth={2.5} size={s.icon} className="text-black" />
      </div>
      <div className="font-display leading-none">
        <div className={`${s.title} text-white tracking-wide`}>FUTSAL</div>
        <div className={`${s.sub} text-white/70 tracking-label uppercase mt-0.5`}>Time Hub</div>
      </div>
    </div>
  );

  if (linkTo) {
    return (
      <a href={linkTo} className="inline-block">
        {content}
      </a>
    );
  }
  return content;
}
