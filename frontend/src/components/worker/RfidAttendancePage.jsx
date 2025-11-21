import React from 'react';
import { useNavigate } from 'react-router-dom';
import RfidAttendance from './RfidAttendance';
import Button from '../common/Button';

const RfidAttendancePage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">RFID Attendance</h1>
        <Button variant="outline" onClick={() => navigate('/worker')}>
          Back to Dashboard
        </Button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <RfidAttendance />
      </div>
    </div>
  );
};

export default RfidAttendancePage;