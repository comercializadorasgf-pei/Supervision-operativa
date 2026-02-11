import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StorageService } from './services/storage';
import Preloader from './components/Preloader';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import ClientDetails from './pages/ClientDetails';
import CreateClient from './pages/CreateClient';
import CreateVisit from './pages/CreateVisit';
import SupervisorTracking from './pages/SupervisorTracking';
import MyVisits from './pages/MyVisits';
import PerformVisit from './pages/PerformVisit';
import VisitDetails from './pages/VisitDetails';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Profile from './pages/Profile';
import SupervisorsManagement from './pages/SupervisorsManagement';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import ClientReports from './pages/ClientReports';
import Messages from './pages/Messages';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AppContents = () => {
    const [isInitializing, setIsInitializing] = React.useState(true);

    useEffect(() => {
        const init = async () => {
            try {
                await StorageService.syncWithSupabase();
            } finally {
                // Ensure preloader shows for at least 1.5s for branding/UX
                setTimeout(() => setIsInitializing(false), 1500);
            }
        };
        init();
    }, []);

    if (isInitializing) {
        return <Preloader />;
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />

                {/* Protected Routes */}
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

                {/* Feature Modules */}
                <Route path="/clients" element={<ProtectedRoute><ClientsList /></ProtectedRoute>} />
                <Route path="/client-details/:clientId" element={<ProtectedRoute><ClientDetails /></ProtectedRoute>} />
                <Route path="/create-client" element={<ProtectedRoute><CreateClient /></ProtectedRoute>} />

                <Route path="/create-visit" element={<ProtectedRoute><CreateVisit /></ProtectedRoute>} />
                <Route path="/perform-visit/:visitId" element={<ProtectedRoute><PerformVisit /></ProtectedRoute>} />
                <Route path="/supervisor-tracking" element={<ProtectedRoute><SupervisorTracking /></ProtectedRoute>} />
                <Route path="/my-visits" element={<ProtectedRoute><MyVisits /></ProtectedRoute>} />

                {/* Make details dynamic */}
                <Route path="/visit-details" element={<ProtectedRoute><VisitDetails /></ProtectedRoute>} />
                <Route path="/visit-details/:visitId" element={<ProtectedRoute><VisitDetails /></ProtectedRoute>} />

                {/* New Functional Modules */}
                <Route path="/supervisors-manage" element={<ProtectedRoute><SupervisorsManagement /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/reports/:clientId" element={<ProtectedRoute><ClientReports /></ProtectedRoute>} />
            </Routes>
        </BrowserRouter>
    );
};

const App = () => {
    return (
        <AuthProvider>
            <AppContents />
        </AuthProvider>
    );
};

export default App;