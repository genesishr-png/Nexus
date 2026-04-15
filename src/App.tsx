import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import FolderGenerator from './components/FolderGenerator';
import CodeGenerator from './components/CodeGenerator';
import SplashScreen from './components/SplashScreen';
import ImportData from './components/ImportData';
import ContractList from './components/ContractList';

type Page = 'dashboard' | 'folder' | 'code' | 'history' | 'import';

function App() {
    const [page, setPage] = useState<Page>('dashboard');
    const [showSplash, setShowSplash] = useState(true);

    return (
        <div className="relative min-h-screen font-sans antialiased text-slate-100 bg-[#0f172a]">
            {/* Splash Screen Overlay */}
            {showSplash && (
                <SplashScreen onFinish={() => setShowSplash(false)} />
            )}

            {/* Main Content - Always rendered behind splash for smooth transition */}
            <main className={showSplash ? 'opacity-0' : 'animate-fade-in'}>
                {page === 'dashboard' && (
                    <Dashboard onNavigate={(p) => setPage(p)} />
                )}

                {page === 'folder' && (
                    <FolderGenerator onBack={() => setPage('dashboard')} />
                )}

                {page === 'code' && (
                    <CodeGenerator onBack={() => setPage('dashboard')} />
                )}

                {page === 'history' && (
                    <ContractList onBack={() => setPage('dashboard')} />
                )}

                {page === 'import' && (
                    <ImportData onBack={() => setPage('dashboard')} />
                )}
            </main>
        </div>
    );
}

export default App;
