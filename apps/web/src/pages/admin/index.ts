// Admin route table — Agent A: import these into the main React Router.
// Example (in apps/web/src/App.tsx or routes file):
//   import { adminRoutes } from './pages/admin';
//   {adminRoutes.map(r => <Route key={r.path} path={r.path} element={<r.element />} />)}
// Admin pages are self-contained (no imports from outside the admin folders) and
// each page guards itself via useAdminGuard / useAdminData (401/403 -> /admin/login).
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminModeration from './AdminModeration';
import AdminReports from './AdminReports';
import AdminAnnouncements from './AdminAnnouncements';
import AdminSettings from './AdminSettings';
import AdminAuditLogs from './AdminAuditLogs';

export const adminRoutes = [
  { path: '/admin/login', element: AdminLogin },
  { path: '/admin', element: AdminDashboard },
  { path: '/admin/users', element: AdminUsers },
  { path: '/admin/moderation', element: AdminModeration },
  { path: '/admin/reports', element: AdminReports },
  { path: '/admin/announcements', element: AdminAnnouncements },
  { path: '/admin/settings', element: AdminSettings },
  { path: '/admin/audit-logs', element: AdminAuditLogs },
];

export {
  AdminLogin,
  AdminDashboard,
  AdminUsers,
  AdminModeration,
  AdminReports,
  AdminAnnouncements,
  AdminSettings,
  AdminAuditLogs,
};
