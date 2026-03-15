"use client";

import { useEffect } from 'react';
import { Workbox } from 'workbox-window';

export function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.hostname !== 'localhost') {
            const wb = new Workbox('/sw.js');

            wb.addEventListener('installed', (event) => {
                if (event.isUpdate) {
                    console.log('New version available! Reloading...');
                    window.location.reload();
                }
            });

            wb.register();
        }
    }, []);

    return null;
}
