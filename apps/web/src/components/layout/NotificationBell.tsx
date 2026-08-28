'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSound } from '../sound/SoundProvider';
import { fetchNotifications, markNotificationAsRead } from '../../lib/api/issues';
import { NotificationData } from '../../lib/types';

export const NotificationBell: React.FC = () => {
  const { playClickSound } = useSound();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch {
      // Ignored if unauthenticated
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {
      // Ignored
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          playClickSound();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 text-[#78716c] hover:text-[#1c1917] dark:hover:text-white rounded-lg hover:bg-[#f5f0e6] dark:hover:bg-[#262420] transition-colors relative cursor-pointer"
        title="Notifications"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff6b57] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#1c1b18] border border-[#e7e2d6] dark:border-[#33302a] rounded-2xl shadow-xl p-3 z-50 animate-fade-in space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#f5f0e6] dark:border-[#262420] text-xs font-bold text-[#1c1917] dark:text-white">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="text-[10px] text-[#78716c] font-normal">{unreadCount} unread</span>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 divide-y divide-[#f5f0e6] dark:divide-[#262420]">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#a8a29e]">
                No recent notifications
              </div>
            ) : (
              notifications.slice(0, 8).map(n => (
                <div
                  key={n.id}
                  className={`pt-2 text-xs space-y-1 ${n.isRead ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-[#1c1917] dark:text-white">
                      {n.eventType.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {!n.isRead && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="text-[10px] text-[#3b82f6] hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#78716c] leading-tight">
                    {n.payload?.title || n.payload?.message || JSON.stringify(n.payload || '')}
                  </p>
                  <span className="text-[9px] text-[#a8a29e]">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
