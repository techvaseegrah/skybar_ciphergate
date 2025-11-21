import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Spinner from './Spinner';

const PrivateRoute = ({ 
  allowedRoles = [], 
  redirectPath = '/login'
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const token = localStorage.getItem('token');
  const location = useLocation();

  // Debug logging
  useEffect(() => {
    console.log('PrivateRoute - Auth state:', { user, loading, token, isAuthenticated });
  }, [user, loading, token, isAuthenticated]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // More robust authentication check
  const isAuthorized = 
    token && 
    user && 
    (allowedRoles.length === 0 || allowedRoles.includes(user.role));
  
  // Intelligent redirect path
  const getRedirectPath = () => {
    if (allowedRoles.includes('admin')) return '/admin/login';
    if (allowedRoles.includes('worker')) return '/worker/login';
    return redirectPath;
  };

  // Debug logging for authorization decision
  console.log('PrivateRoute - Authorization check:', { 
    isAuthorized, 
    tokenExists: !!token, 
    userExists: !!user,
    userRole: user?.role,
    allowedRoles,
    location: location.pathname
  });

  // Render outlet or redirect
  return isAuthorized 
    ? <Outlet /> 
    : <Navigate to={getRedirectPath()} replace />;
};

export default PrivateRoute;
