import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../../components/admin/Dashboard';
import WorkerManagement from '../../components/admin/WorkerManagement';
import LeaveManagement from '../../components/admin/LeaveManagement';
import DepartmentManagement from '../../components/admin/DepartmentManagement';
import SalaryManagement from '../../components/admin/SalaryManagement';
import AdvanceManagement from '../../components/admin/AdvanceManagement';
import HolidayManagement from '../../components/admin/HolidayManagement';
// SalaryReport is now imported in App.jsx

const AdminDashboard = () => {
  return (
    <Routes>
      <Route index element={<Dashboard />} />
      <Route path="workers" element={<WorkerManagement />} />
      <Route path="salary" element={<SalaryManagement />} />
      <Route path="advances" element={<AdvanceManagement />} />
      <Route path="leaves" element={<LeaveManagement />} />
      <Route path="departments" element={<DepartmentManagement />} />
      <Route path="holidays" element={<HolidayManagement />} />
      {/* Redirect to dashboard for unknown routes */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default AdminDashboard;