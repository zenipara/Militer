import { lazy, Suspense } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Lazy-loaded pages

// Contoh lazy import yang aman (case-sensitive, path relatif dari file ini, pastikan file ada):
// const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
// Jika error, cek penamaan file/folder (huruf besar/kecil harus sama persis)

const Login = lazy(() => import('../pages/Login'));
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const AuditLog = lazy(() => import('../pages/admin/AuditLog'));
const Logistics = lazy(() => import('../pages/admin/Logistics'));
const Documents = lazy(() => import('../pages/admin/Documents'));
const Announcements = lazy(() => import('../pages/admin/Announcements'));
const ShiftSchedule = lazy(() => import('../pages/admin/ShiftSchedule'));
const AttendanceReport = lazy(() => import('../pages/admin/AttendanceReport'));
const Settings = lazy(() => import('../pages/admin/Settings'));
const KomandanDashboard = lazy(() => import('../pages/komandan/KomandanDashboard'));
const TaskManagement = lazy(() => import('../pages/komandan/TaskManagement'));
const Personnel = lazy(() => import('../pages/komandan/Personnel'));
const Reports = lazy(() => import('../pages/komandan/Reports'));
const Evaluation = lazy(() => import('../pages/komandan/Evaluation'));
const KomandanAttendance = lazy(() => import('../pages/komandan/KomandanAttendance'));
const LogisticsRequest = lazy(() => import('../pages/komandan/LogisticsRequest'));
const PrajuritDashboard = lazy(() => import('../pages/prajurit/PrajuritDashboard'));
const MyTasks = lazy(() => import('../pages/prajurit/MyTasks'));
const Attendance = lazy(() => import('../pages/prajurit/Attendance'));
const Messages = lazy(() => import('../pages/prajurit/Messages'));
const LeaveRequest = lazy(() => import('../pages/prajurit/LeaveRequest'));const Profile = lazy(() => import('../pages/prajurit/Profile'));
const GatePassPage = lazy(() => import('../pages/prajurit/GatePassPage'));
const ScanPosJagaPage = lazy(() => import('../pages/prajurit/ScanPosJagaPage'));
const GatePassApprovalPage = lazy(() => import('../pages/komandan/GatePassApprovalPage'));
const GuardDashboard = lazy(() => import('../pages/guard/GuardDashboard'));
const GatePassMonitorPage = lazy(() => import('../pages/admin/GatePassMonitorPage'));
const PosJagaPage = lazy(() => import('../pages/admin/PosJagaPage'));
const ErrorPage = lazy(() => import('../pages/ErrorPage'));

const wrap = (element: React.ReactNode) => (
  <Suspense fallback={<LoadingSpinner fullScreen />}>{element}</Suspense>
);

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: wrap(<Login />),
  },
  // Admin routes
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      { path: '/admin/dashboard', element: wrap(<AdminDashboard />) },
      { path: '/admin/users', element: wrap(<UserManagement />) },
      { path: '/admin/audit', element: wrap(<AuditLog />) },
      { path: '/admin/logistics', element: wrap(<Logistics />) },
      { path: '/admin/documents', element: wrap(<Documents />) },
      { path: '/admin/announcements', element: wrap(<Announcements />) },
      { path: '/admin/schedule', element: wrap(<ShiftSchedule />) },
      { path: '/admin/attendance', element: wrap(<AttendanceReport />) },
      { path: '/admin/settings', element: wrap(<Settings />) },
      { path: '/admin/gatepass-monitor', element: wrap(<GatePassMonitorPage />) },
      { path: '/admin/pos-jaga',         element: wrap(<PosJagaPage />) },
    ],
  },
  // Komandan routes
  {
    element: <ProtectedRoute allowedRoles={['komandan', 'admin']} />,
    children: [
      { path: '/komandan/dashboard', element: wrap(<KomandanDashboard />) },
      { path: '/komandan/tasks', element: wrap(<TaskManagement />) },
      { path: '/komandan/personnel', element: wrap(<Personnel />) },
      { path: '/komandan/reports', element: wrap(<Reports />) },
      { path: '/komandan/evaluation', element: wrap(<Evaluation />) },
      { path: '/komandan/attendance', element: wrap(<KomandanAttendance />) },
      { path: '/komandan/logistics-request', element: wrap(<LogisticsRequest />) },
      { path: '/komandan/gatepass-approval', element: wrap(<GatePassApprovalPage />) },
      { path: '/komandan/gatepass-monitor', element: wrap(<GatePassMonitorPage />) },
      { path: '/komandan/messages', element: wrap(<Messages />) },
    ],
  },
  // Prajurit routes
  {
    element: <ProtectedRoute allowedRoles={['prajurit', 'komandan', 'admin']} />,
    children: [
      { path: '/prajurit/dashboard', element: wrap(<PrajuritDashboard />) },
      { path: '/prajurit/tasks', element: wrap(<MyTasks />) },
      { path: '/prajurit/attendance', element: wrap(<Attendance />) },
      { path: '/prajurit/messages', element: wrap(<Messages />) },
      { path: '/prajurit/leave', element: wrap(<LeaveRequest />) },
      { path: '/prajurit/profile', element: wrap(<Profile />) },
      { path: '/prajurit/gatepass', element: wrap(<GatePassPage />) },
      { path: '/prajurit/scan-pos', element: wrap(<ScanPosJagaPage />) },
    ],
  },
  // Guard route
  {
    element: <ProtectedRoute allowedRoles={['guard', 'admin']} />,
    children: [
      { path: '/guard/gatepass-scan', element: wrap(<GuardDashboard />) },
    ],
  },
  {
    path: '/error',
    element: wrap(<ErrorPage />),
  },
  {
    path: '*',
    element: (
      <div className="flex items-center justify-center min-h-screen bg-military-dark text-text-primary">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <p className="text-xl text-text-muted mb-6">Halaman tidak ditemukan</p>
          <a href={`${import.meta.env.BASE_URL}#/login`} className="btn-primary px-6 py-2 rounded-lg">
            Kembali ke Login
          </a>
        </div>
      </div>
    ),
  },
]);
