import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import AdminProtectedRoute from './components/AdminProtectedRoute'
import ProtectedRoute from './components/ProtectedRoute'
import PublicOnlyRoute from './components/PublicOnlyRoute'
import AdminApprovalsPage from './pages/AdminApprovalsPage'
import DirectorPlaceholderPage from './pages/DirectorPlaceholderPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import RegisterPage from './pages/RegisterPage'
import StockManagerPlaceholderPage from './pages/StockManagerPlaceholderPage'

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      <Route element={<AdminProtectedRoute />}>
        <Route path="/admin" element={<Navigate to="/admin/approvals" replace />} />
        <Route
          path="/admin/dashboard"
          element={<Navigate to="/admin/approvals" replace />}
        />
        <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="directeur" />}>
        <Route
          path="/directeur"
          element={<Navigate to="/directeur/dashboard" replace />}
        />
        <Route path="/directeur/dashboard" element={<DirectorPlaceholderPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRole="gestionnaire" />}>
        <Route
          path="/gestionnaire-stock"
          element={<Navigate to="/gestionnaire-stock/dashboard" replace />}
        />
        <Route
          path="/gestionnaire-stock/dashboard"
          element={<StockManagerPlaceholderPage />}
        />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
