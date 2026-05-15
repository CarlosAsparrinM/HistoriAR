import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Toaster from './components/ui/sonner';
import LoginForm from './components/LoginForm';
import AppSidebar from './components/AppSidebar';
import Dashboard from './components/Dashboard';
import MonumentsManager from './components/MonumentsManager';
import InstitutionsManager from './components/InstitutionsManager';
import CategoriesManager from './components/CategoriesManager';
import CulturesManager from './components/CulturesManager';
import UsersManager from './components/UsersManager';
import ToursManager from './components/ToursManager';
import ARExperiencesManager from './components/ARExperiencesManager';
import HistoricalDataManager from './components/HistoricalDataManager';
import QuizzesManager from './components/QuizzesManager';
import { SidebarProvider, SidebarInset } from './components/ui/sidebar';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/monuments" element={<MonumentsManager />} />
            <Route path="/institutions" element={<InstitutionsManager />} />
            <Route path="/categories" element={<CategoriesManager />} />
            <Route path="/cultures" element={<CulturesManager />} />
            
            {/* AR Experiences with nested routes */}
            <Route path="/ar-experiences" element={<ARExperiencesManager />} />
            <Route path="/ar-experiences/manage/:monumentId" element={<ARExperiencesManager />} />
            
            {/* Quizzes with nested routes */}
            <Route path="/quizzes" element={<QuizzesManager />} />
            <Route path="/quizzes/monument/:monumentId" element={<QuizzesManager />} />
            
            {/* Tours with nested routes */}
            <Route path="/tours" element={<ToursManager />} />
            <Route path="/tours/edit/:tourId" element={<ToursManager />} />
            
            {/* Historical Data with nested routes */}
            <Route path="/historical-data" element={<HistoricalDataManager />} />
            <Route path="/historical-data/monument/:monumentId" element={<HistoricalDataManager />} />
            
            <Route path="/users" element={<UsersManager />} />
            <Route path="/messaging" element={
              <div className="p-6">
                <h1>Sistema de Mensajería</h1>
                <p>Funcionalidad en desarrollo...</p>
              </div>
            } />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
