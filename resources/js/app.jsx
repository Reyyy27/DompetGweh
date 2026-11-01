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
                <main className="grid min-h-screen place-items-center bg-[#09090B] p-6 text-[#F4F4F5]">
                    <div className="max-w-md rounded-2xl border border-[#F43F5E]/20 bg-[#18181B] p-6">
                        <p className="text-sm font-bold text-[#FDA4AF]">Aplikasi gagal dimuat</p>
                        <p className="mt-2 text-sm text-slate-400">Muat ulang halaman. Jika masalah berlanjut, periksa koneksi server dan log aplikasi.</p>
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
