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
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<Client360 />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetails />} />
        <Route path="projects/:projectId/steps/:stepId" element={<StepEditor />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetails />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/client/:id" element={<ClientReportDetail />} />
        <Route path="reports/agent/:id" element={<AgentReportDetail />} />
        <Route path="ai-agents/report" element={<AITools />} />
        <Route path="ai-agents/knowledge-base" element={<KnowledgeBase />} />
        <Route path="ai-agents/leads" element={<Leads />} />
        <Route path="ai-agents/config" element={<AIConfig />} />
        <Route path="staff" element={<Staff />} />
        <Route path="staff/:id" element={<Staff360 />} />
        <Route path="settings" element={<Settings />} />
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