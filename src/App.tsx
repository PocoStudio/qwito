import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/auth/auth_register/register';
import Login from './pages/auth/auth_login/login';
import AccountView from './pages/auth/account_view';
import GoogleAuth from './pages/auth/auth_google/google-auth';
import VerifAuthGoogle from './pages/auth/auth_google/verif_auth_google';
import CheckMail from './pages/auth/auth_email/check-mail';
import ResetPassword from './pages/auth/auth_login/reset_password';

// Import des composants du panel
import PanelLayout from './pages/panel/PanelLayout';
import PanelHome from './pages/panel/PanelHome';
import ChannelsHome from './pages/panel/channels/ChannelsHome';
import ChannelView from './pages/panel/channels/ChannelView';
import NewChannel from './pages/panel/channels/NewChannel';
import SettingsView from './pages/panel/settings/SettingsView';
import SettingsChannel from './pages/panel/settings/SettingsChannel';
import InvitationsList from './pages/panel/invitations/InvitationsList';

// Import des composants de protection de route
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';

// Import de la bannière de développement
import { BannerDev } from './components/banner-dev';

import { useAuth } from './hooks/useAuth';

function App() {
  const { user } = useAuth();

  return (
    <Router>
      <BannerDev />
      
      <Routes>
        {/* Routes publiques - accessibles uniquement si NON connecté */}
        <Route element={<PublicRoute />}>
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Routes d'authentification spéciales - accessibles à tous */}
        <Route path="/google-auth" element={<GoogleAuth />} />
        <Route path="/verif-auth-google" element={<VerifAuthGoogle />} />
        <Route path="/check-mail" element={<CheckMail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        
        
        {/* Routes protégées - accessibles uniquement si connecté */}
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<AccountView />} />
          <Route path="/uploads/*" element={null} />
          
          {/* Routes du panel */}
          <Route path="/panel" element={<PanelLayout />}>
            <Route index element={<PanelHome />} />
            <Route path="channels" element={<ChannelsHome />} />
            <Route path="settings" element={<SettingsView />} />
            <Route path="settings/channel/:channelId" element={<SettingsChannel />} />
            <Route path="channels/:channelId" element={<ChannelView />} />
            <Route path="channels/new" element={<NewChannel />} />
            <Route path="invitations" element={<InvitationsList />} />
          </Route>
        </Route>
        
        {/* Redirection par défaut - vers login si non connecté, sinon vers panel */}
        <Route path="*" element={
          user ? <Navigate to="/panel" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;
