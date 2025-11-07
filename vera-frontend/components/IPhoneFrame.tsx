'use client';

import React from 'react';

interface IPhoneFrameProps {
  children: React.ReactNode;
}

export default function IPhoneFrame({ children }: IPhoneFrameProps) {
  return (
    <>
      {/* Mobile view: Full-screen without iPhone frame */}
      <div className="md:hidden min-h-screen bg-white">
        {children}
      </div>

      {/* Desktop view: iPhone frame mockup */}
      <div className="hidden md:flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-800 via-gray-900 to-black p-4">
        {/* iPhone 14 Pro-style device frame */}
        <div className="relative">
          {/* Phone outer shell */}
          <div className="relative w-[390px] h-[844px] bg-black rounded-[55px] shadow-2xl border-[14px] border-gray-800">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[150px] h-[35px] bg-black rounded-b-3xl z-50"></div>

            {/* Status bar icons */}
            <div className="absolute top-0 left-0 right-0 h-[50px] flex items-start justify-between px-8 pt-3 z-40 text-white text-xs">
              {/* Left side - Time */}
              <div className="font-semibold">
                {new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </div>

              {/* Right side - Status icons */}
              <div className="flex items-center gap-1">
                {/* Signal */}
                <svg className="w-4 h-3" fill="white" viewBox="0 0 24 24">
                  <rect x="1" y="16" width="3" height="6" rx="1"/>
                  <rect x="6" y="12" width="3" height="10" rx="1"/>
                  <rect x="11" y="8" width="3" height="14" rx="1"/>
                  <rect x="16" y="4" width="3" height="18" rx="1"/>
                </svg>

                {/* WiFi */}
                <svg className="w-4 h-3" fill="white" viewBox="0 0 24 24">
                  <path d="M12 18c.8 0 1.5.7 1.5 1.5S12.8 21 12 21s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5zm0-3c1.9 0 3.6.8 4.8 2l-1.4 1.4c-.9-.9-2.1-1.4-3.4-1.4s-2.5.5-3.4 1.4L7.2 17c1.2-1.2 2.9-2 4.8-2zm0-3c2.8 0 5.4 1.2 7.2 3l-1.4 1.4c-1.5-1.5-3.5-2.4-5.8-2.4s-4.3.9-5.8 2.4L4.8 15c1.8-1.8 4.4-3 7.2-3z"/>
                </svg>

                {/* Battery */}
                <svg className="w-6 h-3" fill="none" stroke="white" viewBox="0 0 24 24">
                  <rect x="2" y="7" width="18" height="10" rx="2" strokeWidth="1.5"/>
                  <rect x="4" y="9" width="14" height="6" fill="white"/>
                  <path d="M20 10v4" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            {/* Screen content area */}
            <div className="absolute top-[50px] left-0 right-0 bottom-0 bg-white rounded-b-[40px] overflow-hidden">
              {children}
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-900 rounded-full"></div>
          </div>

          {/* Side buttons */}
          <div className="absolute top-24 -left-2 w-1 h-8 bg-gray-700 rounded-l"></div>
          <div className="absolute top-36 -left-2 w-1 h-14 bg-gray-700 rounded-l"></div>
          <div className="absolute top-52 -left-2 w-1 h-14 bg-gray-700 rounded-l"></div>
          <div className="absolute top-48 -right-2 w-1 h-20 bg-gray-700 rounded-r"></div>
        </div>
      </div>
    </>
  );
}
