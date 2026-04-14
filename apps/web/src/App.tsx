import { BrowserRouter, Routes, Route } from 'react-router';
import './app.css';
import { QueryProvider } from './providers/QueryProvider';
import { ToastProvider } from './components/ui/ToastProvider';
import { HomePage } from './pages/HomePage';
import { DemoPage } from './pages/DemoPage';
import { BoardPage } from './pages/BoardPage';

export default function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-bg-base text-text-primary font-body">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/demo" element={<DemoPage />} />

              <Route path="/board/:boardId" element={<BoardPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </ToastProvider>
    </QueryProvider>
  );
}
