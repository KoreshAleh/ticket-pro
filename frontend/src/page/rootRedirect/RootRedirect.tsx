import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-gray-950 text-gray-100 min-h-screen flex items-center justify-center">
        <div className="animate-spin border-4 w-8 h-8 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return user.role === 'admin' 
      ? <Navigate to="/adminpage" replace />
      : <Navigate to="/userpage" replace />; 
  }

  return <Navigate to="/mainpage" replace />;
}

export default RootRedirect;