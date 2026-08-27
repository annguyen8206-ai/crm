import React from 'react';
import { User } from 'lucide-react';

interface PatientAvatarProps {
  src?: string;
  name: string;
  gender?: 'Nam' | 'Nữ' | 'Khác' | string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showInitialsFallback?: boolean;
}

export const getInitials = (fullName: string): string => {
  if (!fullName) return 'BN';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarBgColor = (name: string, gender?: string): string => {
  if (gender === 'Nữ') {
    return 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white';
  }
  if (gender === 'Nam') {
    return 'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white';
  }
  // Deterministic color based on name hash
  const colors = [
    'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white',
    'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white',
    'bg-gradient-to-tr from-amber-500 to-orange-500 text-white',
    'bg-gradient-to-tr from-blue-500 to-cyan-500 text-white',
    'bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const PatientAvatar: React.FC<PatientAvatarProps> = ({
  name,
  gender,
  className = 'w-10 h-10 rounded-xl',
  showInitialsFallback = true
}) => {
  const bgClass = getAvatarBgColor(name, gender);
  const initials = getInitials(name);

  return (
    <div
      className={`flex items-center justify-center font-bold select-none shrink-0 shadow-2xs ${bgClass} ${className}`}
      title={`Hồ sơ: ${name} (${gender || 'Y tế'})`}
    >
      {showInitialsFallback ? (
        <span className="text-xs tracking-wider font-bold">{initials}</span>
      ) : (
        <User className="w-1/2 h-1/2" />
      )}
    </div>
  );
};

