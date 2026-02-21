import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { NotificationProvider, useNotification } from './contexts/NotificationContext'
import { ActiveDownloadProvider } from './contexts/ActiveDownloadContext'
import ErrorBoundary from './components/ErrorBoundary'
import Header from './components/Header'
import Footer from './components/Footer'
import ActiveDownloadsPanel from './components/ActiveDownloadsPanel'
import InvalidApiKeyModal from './components/InvalidApiKeyModal'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import DownloadsPage from './pages/DownloadsPage'
import SettingsPage from './pages/SettingsPage'
import MetricsPage from './pages/MetricsPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import FAQPage from './pages/FAQPage'
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
      <div className="min-h-screen bg-brand-bg flex items-center justify-center relative z-10">
        <div className="text-center">
          <FiLoader className="h-8 w-8 animate-spin text-brand-primary mx-auto mb-4" />
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
  const { state: notificationState, hideInvalidApiKeyModal } = useNotification()

  return (
    <div className="min-h-screen bg-brand-bg text-gray-100 flex flex-col relative z-10">
      <Header />
      
      <main className="flex-1">
        <Routes>
          <Route path="/auth" element={
            <AuthRoute />
          } />
          <Route path="/" element={
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
              <HomePage />
            </div>
          } />
          <Route path="/search" element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <SearchPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/downloads" element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <DownloadsPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <SettingsPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/metrics" element={
            <ProtectedRoute>
              <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <MetricsPage />
              </div>
            </ProtectedRoute>
          } />
          <Route path="/privacy" element={
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
              <PrivacyPolicyPage />
            </div>
          } />
          <Route path="/terms" element={
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
              <TermsOfServicePage />
            </div>
          } />
          <Route path="/faq" element={
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
              <FAQPage />
            </div>
          } />
        </Routes>
      </main>
      
      <Footer />

      {isAuthenticated && <ActiveDownloadsPanel />}

      <InvalidApiKeyModal
        isOpen={notificationState.invalidApiKeyModal.isOpen}
        onClose={hideInvalidApiKeyModal}
        message={notificationState.invalidApiKeyModal.message}
      />
    </div>
  )
}

const AuthRoute = () => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <ActiveDownloadProvider>
              <AppContent />
            </ActiveDownloadProvider>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  )
}

export default App
