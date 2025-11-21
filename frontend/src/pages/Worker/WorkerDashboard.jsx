import { Routes, Route, Navigate } from 'react-router-dom';
import WorkerLayout from '../../components/layout/WorkerLayout';
import Dashboard from '../../components/worker/Dashboard';
import LeaveApplication from '../../components/worker/ApplyForLeave';
import LeaveRequests from '../../components/worker/LeaveRequests';
import AttendanceReport from '../../components/worker/AttendanceReport';
import Notifications from '../../components/worker/Notifications';
import FaceAttendancePage from '../../components/worker/FaceAttendancePage';
import RfidAttendancePage from '../../components/worker/RfidAttendancePage';
import AttendanceMethods from '../../components/worker/AttendanceMethods'; // Import AttendanceMethods

const WorkerDashboard = () => {
  return (
    <WorkerLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/attendance" element={<AttendanceReport />} />
        <Route path="/attendance-methods" element={<AttendanceMethods />} /> {/* Add AttendanceMethods route */}
        <Route path="/face-attendance" element={<FaceAttendancePage />} />
        <Route path="/rfid-attendance" element={<RfidAttendancePage />} />
        <Route path="/leave-apply" element={<LeaveApplication />} />
        <Route path="/leave-requests" element={<LeaveRequests />} />
        <Route path="/notifications" element={<Notifications />} />
        
        {/* Redirect to dashboard for unknown routes */}
        <Route path="*" element={<Navigate to="/worker" replace />} />
      </Routes>
    </WorkerLayout>
  );
};

export default WorkerDashboard;