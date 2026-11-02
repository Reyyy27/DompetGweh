import './bootstrap';
import React from 'react';
import { createRoot } from 'react-dom/client';
import DompetApp from './DompetApp';

class AppErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error) {
        console.error('DompetGweh render error:', error);
    }

    render() {
        if (this.state.error) {
            return (
                <main className="grid min-h-screen place-items-center bg-[#F8FAFC] p-6 text-[#0F172A]">
                    <div className="max-w-md rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                        <p className="text-sm font-bold text-[#2563EB]">Aplikasi gagal dimuat</p>
                        <p className="mt-2 text-sm text-slate-600">Muat ulang halaman. Jika masalah berlanjut, periksa koneksi server dan log aplikasi.</p>
                    </div>
                </main>
            );
        }

        return this.props.children;
    }
}

const root = document.getElementById('app');

if (root) {
    createRoot(root).render(
        <React.StrictMode>
            <AppErrorBoundary>
                <DompetApp />
            </AppErrorBoundary>
        </React.StrictMode>,
    );
}
