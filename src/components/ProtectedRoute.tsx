import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { User } from '../types';

interface ProtectedRouteProps {
  user: User | null;
  isAuthReady: boolean;
  requiredAdmin?: boolean;
}

export default function ProtectedRoute({ user, isAuthReady, requiredAdmin }: ProtectedRouteProps) {
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredAdmin && !user.is_super_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
