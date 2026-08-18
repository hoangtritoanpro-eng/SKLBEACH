import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import Grades from './pages/Grades';

import Users from './pages/Users';
import ParentView from './pages/ParentView';
import Lessons from './pages/Lessons';
import Violations from './pages/Violations';
import Points from './pages/Points';
import Notices from './pages/Notices';
import Library from './pages/Library';
import Exams from './pages/Exams';
import ExamBuilder from './pages/ExamBuilder';
import ClassReports from './pages/ClassReports';
import Approvals from './pages/Approvals';

function Require({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/classes" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/parent/:studentId" element={<ParentView />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Require roles={['ADMIN']}><Dashboard /></Require>} />
        <Route path="/classes" element={<Require><Classes /></Require>} />
        <Route path="/grades" element={<Require roles={['ADMIN','TEACHER']}><Grades /></Require>} />

        <Route path="/users" element={<Require roles={['ADMIN']}><Users /></Require>} />
        <Route path="/lessons" element={<Require><Lessons /></Require>} />
        <Route path="/violations" element={<Require><Violations /></Require>} />
        <Route path="/points" element={<Require><Points /></Require>} />
        <Route path="/notices" element={<Require><Notices /></Require>} />
        <Route path="/library" element={<Require><Library /></Require>} />
        <Route path="/exams" element={<Require roles={['ADMIN', 'TEACHER']}><Exams /></Require>} />
        <Route path="/exams/build" element={<Require roles={['ADMIN', 'TEACHER']}><ExamBuilder /></Require>} />
        <Route path="/class-reports" element={<Require roles={['ADMIN', 'TEACHER']}><ClassReports /></Require>} />
        <Route path="/approvals" element={<Require roles={['ADMIN', 'TEACHER']}><Approvals /></Require>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
