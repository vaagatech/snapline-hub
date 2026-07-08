import { Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ReportDetailPage from './pages/ReportDetailPage';
import ReportsPage from './pages/ReportsPage';
import UploadPage from './pages/UploadPage';

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/reports/:id" element={<ReportDetailPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Routes>
      </main>
    </div>
  );
}
