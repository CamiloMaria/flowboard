import { BrowserRouter, Routes, Route } from 'react-router';
import './app.css';
import { QueryProvider } from './providers/QueryProvider';
import { HomePage } from './pages/HomePage';
import { DemoPage } from './pages/DemoPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { BoardPage } from './pages/BoardPage';

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-bg-base text-text-primary font-body">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/board/:boardId" element={<BoardPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryProvider>
  );
}
