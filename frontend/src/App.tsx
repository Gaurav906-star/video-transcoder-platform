import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import VideosPage from './pages/VideosPage'
import VideoDetailPage from './pages/VideoDetailPage'
import JobsPage from './pages/JobsPage'
import AnalyticsPage from './pages/AnalyticsPage'

export default function App() {
  return (
    <div className="min-h-screen flex" style={{ background: '#0a0d14' }}>
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-8 overflow-auto animate-fade-in">
          <Routes>
            <Route path="/"           element={<DashboardPage />} />
            <Route path="/upload"     element={<UploadPage />} />
            <Route path="/videos"     element={<VideosPage />} />
            <Route path="/videos/:id" element={<VideoDetailPage />} />
            <Route path="/jobs"       element={<JobsPage />} />
            <Route path="/analytics"  element={<AnalyticsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
