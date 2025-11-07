'use client';

import React from 'react';

interface IPhoneFrameProps {
  children: React.ReactNode;
}

export default function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  );
}
