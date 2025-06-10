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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<AccountView />} />
        <Route path="/google-auth" element={<GoogleAuth />} />
        <Route path="/verif-auth-google" element={<VerifAuthGoogle />} />
        <Route path="/check-mail" element={<CheckMail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
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
        
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
