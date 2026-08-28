'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

type CursorMode = 'bug' | 'default';
type CursorState = 'idle' | 'hover' | 'click' | 'success' | 'error';

interface CursorContextType {
  cursorMode: CursorMode;
  setCursorMode: (mode: CursorMode) => void;
  setCursorState: (state: CursorState) => void;
}

const CursorContext = createContext<CursorContextType>({
  cursorMode: 'bug',
  setCursorMode: () => {},
  setCursorState: () => {},
});

export const useCursor = () => useContext(CursorContext);

export const CursorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cursorMode, setCursorModeState] = useState<CursorMode>('bug');
  const [enabled, setEnabled] = useState<boolean>(true);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<CursorState>('idle');

  const setCursorMode = (mode: CursorMode) => {
    setCursorModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('forgetrack_cursor_mode', mode);
      if (mode === 'bug') {
        document.body.classList.add('custom-cursor-active');
      } else {
        document.body.classList.remove('custom-cursor-active');
      }
    }
  };

  const setCursorState = (st: CursorState) => {
    stateRef.current = st;
    if (cursorRef.current) {
      cursorRef.current.setAttribute('data-state', st);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('forgetrack_cursor_mode');
    const activeMode = saved === 'default' ? 'default' : 'bug';
    setCursorModeState(activeMode);

    // Only disable if touch only
    const isTouchOnly = window.matchMedia('(pointer: coarse) and (hover: none)').matches;
    if (isTouchOnly) {
      setEnabled(false);
      document.body.classList.remove('custom-cursor-active');
      return;
    }

    if (activeMode === 'bug') {
      document.body.classList.add('custom-cursor-active');
    } else {
      document.body.classList.remove('custom-cursor-active');
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;
    let rafId: number;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseDown = () => setCursorState('click');
    const onMouseUp = () => setCursorState('idle');

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, a, input, select, textarea, [role="button"], [data-cursor="hover"], .cursor-pointer')) {
        setCursorState('hover');
      } else {
        setCursorState('idle');
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    window.addEventListener('mouseup', onMouseUp, { passive: true });
    window.addEventListener('mouseover', onMouseOver, { passive: true });

    // Smooth render loop using requestAnimationFrame
    const updatePosition = () => {
      curX += (mouseX - curX) * 0.55;
      curY += (mouseY - curY) * 0.55;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${curX}px, ${curY}px, 0)`;
      }
      rafId = requestAnimationFrame(updatePosition);
    };

    rafId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseover', onMouseOver);
      document.body.classList.remove('custom-cursor-active');
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <CursorContext.Provider value={{ cursorMode, setCursorMode, setCursorState }}>
      {children}
      {enabled && cursorMode === 'bug' && (
        <div
          ref={cursorRef}
          data-state="idle"
          className="fixed top-0 left-0 pointer-events-none z-[999999] will-change-transform -ml-[14px] -mt-[14px] select-none"
          style={{ transform: 'translate3d(-100px, -100px, 0)' }}
        >
          <div className="relative transform transition-transform duration-100 ease-out origin-center hover:scale-125">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md"
            >
              {/* Antennae */}
              <path d="M11 9 Q9 3 5 4" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="5" cy="4" r="1.8" fill="#ff6b57" />
              <path d="M21 9 Q23 3 27 4" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="27" cy="4" r="1.8" fill="#ccee22" />

              {/* Body */}
              <ellipse cx="16" cy="19" rx="10" ry="9.5" fill="#ff7a38" stroke="#1c1917" strokeWidth="1.8" />
              <line x1="16" y1="11" x2="16" y2="28" stroke="#1c1917" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="11.5" cy="18" r="1.4" fill="#1c1917" />
              <circle cx="20.5" cy="18" r="1.4" fill="#1c1917" />

              {/* Head */}
              <circle cx="16" cy="11" r="5.5" fill="#ff7a38" stroke="#1c1917" strokeWidth="1.8" />
              <circle cx="13.8" cy="10.5" r="1.2" fill="#ffffff" />
              <circle cx="14" cy="10.5" r="0.6" fill="#1c1917" />
              <circle cx="18.2" cy="10.5" r="1.2" fill="#ffffff" />
              <circle cx="18" cy="10.5" r="0.6" fill="#1c1917" />
            </svg>
          </div>
        </div>
      )}
    </CursorContext.Provider>
  );
};
