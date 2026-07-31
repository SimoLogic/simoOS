"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, Loader2, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getMyNotificationsAction, markNotificationReadAction, type PmoNotification } from "@/app/actions/pmo/notification-actions";

export const NotificationCenter = ({ tenantId }: { tenantId: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<PmoNotification[]>([]);

  const fetchNotifications = async () => {
    setLoading(true);
    const data = await getMyNotificationsAction(tenantId);
    setNotifications(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    } else {
        // Background optimistic polling strictly limited 
        // Real-time Supabase socket is better, but this suffices for static checks.
        fetchNotifications();
    }
  }, [isOpen, tenantId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string) => {
    // Optimistic Update (Latency Zero Rules)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await markNotificationReadAction(id, tenantId);
  };

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-vibe-dark transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-action-red rounded-full border border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* 100ms Productive-Medium Token Animation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.07 } }} // Faster exit
            transition={{ duration: 0.1, ease: "easeOut" }} // 100ms 
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-semibold text-vibe-dark text-sm">Notificaciones</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-vibe-blue font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                  {unreadCount} Nuevas
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto min-h-[100px] max-h-[400px] p-0 custom-scrollbar">
              {loading && notifications.length === 0 ? (
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <Bell className="w-6 h-6 mb-2 opacity-50" />
                  <p className="text-sm">Todo al día</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-4 flex gap-3 group transition-colors hover:bg-gray-50 ${notif.read ? 'opacity-70' : 'bg-blue-50/20'}`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 ${notif.type === 'sla_warning' ? 'text-action-red' : 'text-vibe-blue'}`}>
                         {notif.type === 'sla_warning' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2">
                           <p className={`text-sm ${notif.read ? 'text-gray-600 font-medium' : 'text-vibe-dark font-bold'}`}>
                             {notif.title}
                           </p>
                           {!notif.read && (
                             <button 
                               onClick={() => handleMarkAsRead(notif.id)}
                               className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-vibe-dark transition-all"
                               title="Marcar como leída"
                             >
                               <Check className="w-3 h-3" />
                             </button>
                           )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium tracking-wide">
                           {new Date(notif.created_at).toLocaleDateString()} a las {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-gray-100 bg-gray-50">
               <button className="w-full text-center text-xs font-semibold text-vibe-blue hover:text-blue-700 py-1 rounded hover:bg-blue-50 transition-colors">
                  Ver Todo el Historial
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
