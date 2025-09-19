import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DownloadProvider, useDownloadContext } from './contexts/DownloadContext'
import { NotificationProvider, useNotification } from './contexts/NotificationContext'
import Header from './components/Header'
import Footer from './components/Footer'
import DownloadPanel from './components/DownloadPanel'
import InvalidApiKeyModal from './components/InvalidApiKeyModal'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import MetricsPage from './pages/MetricsPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import AuthPage from './pages/AuthPage'
import { FiLoader } from 'react-icons/fi'

/**
 * Component to protect routes that require authentication
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {JSX.Element} Protected route component or redirect to auth
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

/**
 * Main application component with routing and context providers
 * @returns {JSX.Element} Main app component
 */
const AppContent = () => {
  const { isAuthenticated } = useAuth()
  const {
    downloads,
    isPanelOpen,
    togglePanel,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    removeDownload,
    clearDownloadHistory,
    deleteDownloadHistory
  } = useDownloadContext()
  const { state: notificationState, hideInvalidApiKeyModal } = useNotification()

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 flex flex-col">
      <Header />
      
      <main className="flex-1">
        <Routes>
          <Route path="/auth" element={
            isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />
          } />
          <Route path="/" element={
            <div className="container mx-auto px-4 py-8">
              <HomePage />
            </div>
          } />
          <Route path="/search" element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 py-8">
                <SearchPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 py-8">
                <SettingsPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/metrics" element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 py-8">
                <MetricsPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/privacy" element={
            <div className="container mx-auto px-4 py-8">
              <PrivacyPolicyPage />
            </div>
          } />
          <Route path="/terms" element={
            <div className="container mx-auto px-4 py-8">
              <TermsOfServicePage />
            </div>
          } />
        </Routes>
      </main>
      
      <Footer />
      
      {/* Panel de téléchargements - seulement si l'utilisateur est authentifié */}
      {isAuthenticated && (
        <DownloadPanel
          isOpen={isPanelOpen}
          onToggle={togglePanel}
          downloads={downloads}
          onCancel={cancelDownload}
          onPause={pauseDownload}
          onResume={resumeDownload}
          onRemove={removeDownload}
          onClearHistory={clearDownloadHistory}
          onDeleteHistory={deleteDownloadHistory}
        />
      )}

      {/* Modal de clé API invalide */}
      <InvalidApiKeyModal
        isOpen={notificationState.invalidApiKeyModal.isOpen}
        onClose={hideInvalidApiKeyModal}
        message={notificationState.invalidApiKeyModal.message}
      />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <DownloadProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </DownloadProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
