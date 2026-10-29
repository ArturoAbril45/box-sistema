import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RequirePermiso({ permiso, children }) {
  const { puede } = useAuth()
  if (!puede(permiso)) return <Navigate to="/admin" replace />
  return children
}
