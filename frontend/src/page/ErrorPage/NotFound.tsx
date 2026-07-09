import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen font-sans antialiased flex flex-col justify-between relative overflow-hidden">
      
      {/* Decorative blurred neon circles in the background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Simple Header for symmetry */}
      <header className="border-b border-gray-900/40 bg-gray-950/20 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/mainpage')}>
            <span className="text-2xl">🎟️</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              TicketPro
            </span>
          </div>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 relative z-10 text-center space-y-6">
        
        {/* Huge neon error number */}
        <h1 className="text-8xl sm:text-9xl font-black tracking-extrawide bg-gradient-to-b from-white via-gray-400 to-gray-850 bg-clip-text text-transparent drop-shadow-sm select-none animate-pulse">
          404
        </h1>

        <div className="space-y-2 max-w-md">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Oops! Page Lost in Space
          </h2>
          <p className="text-sm text-gray-400 font-light leading-relaxed">
            It looks like this event does not exist, or the ticket office has moved to another address.
          </p>
        </div>

        {/* Return Button */}
        <div className="pt-4">
          <button
            onClick={() => navigate('/mainpage')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium text-sm rounded-xl transition active:scale-95 shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            Back to Home →
          </button>
        </div>
      </main>

      {/* Compact Footer */}
      <footer className="py-6 text-center text-xs text-gray-700 border-t border-gray-900/40 bg-gray-950/10">
        &copy; 2026 TicketPro Core Suite &bull; Lost in Space
      </footer>

    </div>
  );
};

export default NotFound;