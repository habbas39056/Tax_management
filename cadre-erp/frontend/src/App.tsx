import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Client360 from './pages/Client360';
import Projects from './pages/Projects';
import ProjectDetails from './pages/ProjectDetails';
import Invoices from './pages/Invoices';
import Cashbook from './pages/Cashbook';
import Commissions from './pages/Commissions';
import AITools from './pages/AITools';
import KnowledgeBase from './pages/ai-agents/KnowledgeBase';
import Leads from './pages/ai-agents/Leads';
import AIConfig from './pages/ai-agents/AIConfig';
import Staff from './pages/Staff';
import Staff360 from './pages/Staff360';
import StepEditor from './pages/StepEditor';
import InvoiceDetails from './pages/InvoiceDetails';
import Reports from './pages/Reports';
import ClientReportDetail from './pages/ClientReportDetail';
import AgentReportDetail from './pages/AgentReportDetail';
import Login from './pages/Login';
import Settings from './pages/Settings';

import ClientPortalLayout from './layouts/ClientPortalLayout';
import ClientDashboard from './pages/portal/ClientDashboard';
import ClientInvoices from './pages/portal/ClientInvoices';
import ClientPayments from './pages/portal/ClientPayments';
import ClientNotes from './pages/portal/ClientNotes';
import ClientProjects from './pages/portal/ClientProjects';
import ClientProjectDetail from './pages/portal/ClientProjectDetail';
import ClientFiles from './pages/portal/ClientFiles';
import ClientProfile from './pages/portal/ClientProfile';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'Client' ? '/portal' : '/'} />;
  }
  
  return <>{children}</>;
};

// Module-Specific Protected Route
const ModuleRoute = ({ children, moduleName, fallbackRoles }: { children: React.ReactNode, moduleName: string, fallbackRoles: string[] }) => {
  const { user } = useAuth();
  if (user?.role === 'Super Admin') return <>{children}</>;
  if (user?.role === 'Client') return <Navigate to="/portal" />;

  let hasAccess = false;
  if (user?.module_access && Array.isArray(user.module_access) && user.module_access.length > 0) {
    hasAccess = user.module_access.includes(moduleName);
  } else {
    hasAccess = fallbackRoles.includes(user?.role || '');
  }

  if (!hasAccess) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* Client Portal Routes */}
      <Route path="/portal" element={<ProtectedRoute allowedRoles={['Client']}><ClientPortalLayout /></ProtectedRoute>}>
        <Route index element={<ClientDashboard />} />
        <Route path="invoices" element={<ClientInvoices />} />
        <Route path="payments" element={<ClientPayments />} />
        <Route path="notes" element={<ClientNotes />} />
        <Route path="projects" element={<ClientProjects />} />
        <Route path="projects/:id" element={<ClientProjectDetail />} />
        <Route path="files" element={<ClientFiles />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Staff Portal Routes */}
      <Route path="/" element={<ProtectedRoute allowedRoles={['Super Admin', 'Sales', 'CSR', 'Operations', 'Accounts']}><MainLayout /></ProtectedRoute>}>
        <Route index element={user?.role === 'Client' ? <Navigate to="/portal" /> : <Dashboard />} />
        <Route path="clients" element={<ModuleRoute moduleName="Clients" fallbackRoles={['Sales', 'CSR']}><Clients /></ModuleRoute>} />
        <Route path="clients/:id" element={<ModuleRoute moduleName="Clients" fallbackRoles={['Sales', 'CSR']}><Client360 /></ModuleRoute>} />
        <Route path="projects" element={<ModuleRoute moduleName="Projects" fallbackRoles={['Sales', 'Operations']}><Projects /></ModuleRoute>} />
        <Route path="projects/:id" element={<ModuleRoute moduleName="Projects" fallbackRoles={['Sales', 'Operations']}><ProjectDetails /></ModuleRoute>} />
        <Route path="projects/:projectId/steps/:stepId" element={<ModuleRoute moduleName="Projects" fallbackRoles={['Sales', 'Operations']}><StepEditor /></ModuleRoute>} />
        <Route path="invoices" element={<ModuleRoute moduleName="Invoices" fallbackRoles={['Accounts', 'Sales']}><Invoices /></ModuleRoute>} />
        <Route path="invoices/:id" element={<ModuleRoute moduleName="Invoices" fallbackRoles={['Accounts', 'Sales']}><InvoiceDetails /></ModuleRoute>} />
        <Route path="cashbook" element={<ModuleRoute moduleName="Cashbook" fallbackRoles={['Accounts', 'Operations']}><Cashbook /></ModuleRoute>} />
        <Route path="commissions" element={<ModuleRoute moduleName="Commissions" fallbackRoles={['Accounts']}><Commissions /></ModuleRoute>} />
        <Route path="reports" element={<ModuleRoute moduleName="Reports" fallbackRoles={['Accounts']}><Reports /></ModuleRoute>} />
        <Route path="reports/client/:id" element={<ModuleRoute moduleName="Reports" fallbackRoles={['Accounts']}><ClientReportDetail /></ModuleRoute>} />
        <Route path="reports/agent/:id" element={<ModuleRoute moduleName="Reports" fallbackRoles={['Accounts']}><AgentReportDetail /></ModuleRoute>} />
        <Route path="ai-agents/report" element={<ModuleRoute moduleName="AI Agents" fallbackRoles={['Operations']}><AITools /></ModuleRoute>} />
        <Route path="ai-agents/knowledge-base" element={<ModuleRoute moduleName="AI Agents" fallbackRoles={['Operations']}><KnowledgeBase /></ModuleRoute>} />
        <Route path="ai-agents/leads" element={<ModuleRoute moduleName="AI Agents" fallbackRoles={['Operations']}><Leads /></ModuleRoute>} />
        <Route path="ai-agents/config" element={<ModuleRoute moduleName="AI Agents" fallbackRoles={['Operations']}><AIConfig /></ModuleRoute>} />
        <Route path="staff" element={<ModuleRoute moduleName="Staff Management" fallbackRoles={[]}><Staff /></ModuleRoute>} />
        <Route path="staff/:id" element={<ModuleRoute moduleName="Staff Management" fallbackRoles={[]}><Staff360 /></ModuleRoute>} />
        <Route path="settings" element={<ModuleRoute moduleName="Settings" fallbackRoles={[]}><Settings /></ModuleRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to={user?.role === 'Client' ? '/portal' : '/'} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;