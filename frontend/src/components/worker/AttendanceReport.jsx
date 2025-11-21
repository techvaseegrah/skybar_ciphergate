import React, { Fragment, useState, useEffect, useContext } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getWorkerAttendance } from '../../services/attendanceService';
import Table from '../common/Table';
import Spinner from '../common/Spinner';
import { toast } from 'react-toastify';
import appContext from '../../context/AppContext';
import { FaDownload } from 'react-icons/fa';
import Button from '../common/Button';

const AttendanceReport = () => {
    const { user } = useAuth();
    const { subdomain } = useContext(appContext);
    const [attendanceData, setAttendanceData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterDate, setFilterDate] = useState('');
    const [filterName, setFilterName] = useState('');
    const [filterRFID, setFilterRFID] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    
    // Error boundary state
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Check if user data is available
        if (!user) {
            const errorMsg = "User data not available. Please login again.";
            toast.error(errorMsg);
            setErrorMessage(errorMsg);
            setHasError(true);
            setIsLoading(false);
            return;
        }
        
        if (!user?.rfid || !subdomain || subdomain === 'main') {
            const errorMsg = "Invalid RFID or subdomain.";
            toast.error(errorMsg);
            setErrorMessage(errorMsg);
            setHasError(true);
            setIsLoading(false);
            return;
        }

        const fetchAttendance = async () => {
            setIsLoading(true);
            setHasError(false);
            setErrorMessage('');
            
            try {
                const data = await getWorkerAttendance({ rfid: user.rfid, subdomain });
                // Ensure we're setting an array even if the response structure is different
                const attendanceArray = Array.isArray(data.attendance) ? data.attendance : 
                                      (data.attendance && Array.isArray(data.attendance.records)) ? data.attendance.records : 
                                      [];
                setAttendanceData(attendanceArray);
            } catch (error) {
                console.error(error);
                const errorMsg = "Failed to fetch attendance data.";
                toast.error(errorMsg);
                setErrorMessage(errorMsg);
                setHasError(true);
                setAttendanceData([]); // Set empty array on error
            } finally {
                setIsLoading(false);
            }
        };

        fetchAttendance();
    }, [user, subdomain]);

    const filteredAttendance = attendanceData.filter(record => {
        // Add additional validation to ensure record is a valid object
        if (!record || typeof record !== 'object') return false;
        
        return (!filterDate || (record.date && record.date.startsWith(filterDate))) &&
               (!filterName || (record.name && record.name.toLowerCase().includes(filterName.toLowerCase()))) &&
               (!filterRFID || (record.rfid && record.rfid.includes(filterRFID))) &&
               (!filterDepartment || (record.departmentName && record.departmentName.toLowerCase().includes(filterDepartment.toLowerCase())));
    });

    // Ensure processedAttendance is always an array
    let safeProcessedAttendance = [];
    try {
        // Check if processAttendanceByDay is a function before calling it
        if (typeof processAttendanceByDay === 'function') {
            const processed = processAttendanceByDay(filteredAttendance);
            safeProcessedAttendance = Array.isArray(processed) ? processed : [];
        } else {
            // Fallback to filteredAttendance if processing function is not available
            safeProcessedAttendance = Array.isArray(filteredAttendance) ? filteredAttendance : [];
        }
    } catch (error) {
        console.error('Error processing attendance data:', error);
        safeProcessedAttendance = Array.isArray(filteredAttendance) ? filteredAttendance : [];
        if (!hasError) {
            setHasError(true);
            setErrorMessage('Error processing attendance data.');
        }
    }

    // Function to download attendance data as CSV
    const downloadAttendanceCSV = () => {
        // Additional safety checks
        if (!safeProcessedAttendance || !Array.isArray(safeProcessedAttendance)) {
            toast.warning("No attendance data available to download");
            return;
        }
        
        if (safeProcessedAttendance.length === 0) {
            toast.warning("No attendance data to download");
            return;
        }
    
        try {
            const headers = [
                'Name',
                'Employee ID',
                'Date',
                'In Times',
                'Out Times',
                'Duration'
            ];
        
            const csvRows = safeProcessedAttendance.map(record => {
                // Safety check for each record
                if (!record || typeof record !== 'object') {
                    return ['Unknown', 'Unknown', 'Unknown', '', '', '00:00:00'];
                }
                
                return [
                    record.name || 'Unknown',
                    record.rfid || 'Unknown',
                    record.date || 'Unknown',
                    (record.inTimes && Array.isArray(record.inTimes)) ? record.inTimes.join(' | ') : '',
                    (record.outTimes && Array.isArray(record.outTimes)) ? record.outTimes.join(' | ') : '',
                    record.duration || '00:00:00'
                ];
            });
        
            let csvContent = headers.join(',') + '\n';
            csvRows.forEach(row => {
                const formattedRow = row.map(cell => {
                    if (cell === null || cell === undefined) return '';
                    const cellString = String(cell);
                    if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
                        return `"${cellString.replace(/"/g, '""')}"`;
                    }
                    return cellString;
                });
                csvContent += formattedRow.join(',') + '\n';
            });
        
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
        
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0];
            const employeeName = (user?.name) ? user.name.replace(/\s+/g, '_') : 'Employee';
            const dateInfo = filterDate ? `_${filterDate}` : `_${formattedDate}`;
            link.setAttribute('download', `${employeeName}_Attendance_Report${dateInfo}.csv`);
        
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        
            toast.success("Attendance report downloaded successfully!");
        } catch (error) {
            console.error('Error generating CSV:', error);
            toast.error("Failed to generate attendance report. Please try again.");
        }
    };
    

    const columns = [
        {
            header: 'Name',
            accessor: 'name',
            render: (record) => {
                // Safety check for record
                if (!record || typeof record !== 'object') {
                    return <div className="flex items-center">Unknown</div>;
                }
                
                return (
                    <div className="flex items-center">
                        {record.photo && (
                            <img
                                src={record.photo ? record.photo : `https://ui-avatars.com/api/?name=${encodeURIComponent(record.name || 'Unknown')}`}
                                alt="Employee"
                                className="w-8 h-8 rounded-full mr-2"
                            />
                        )}
                        {record.name || 'Unknown'}
                    </div>
                );
            }
        },
        {
            header: 'Employee ID',
            accessor: 'rfid',
            render: (record) => {
                // Safety check for record
                if (!record || typeof record !== 'object') {
                    return 'Unknown';
                }
                return record.rfid || 'Unknown';
            }
        },
        
        {
            header: 'Department',
            accessor: 'departmentName',
            render: (record) => {
                // Safety check for record
                if (!record || typeof record !== 'object') {
                    return 'Unknown';
                }
                return record.departmentName || record.department || 'Unknown';
            }
        },
        {
            header: 'Date',
            accessor: 'date',
            render: (record) => {
                // Safety check for record
                if (!record || typeof record !== 'object') {
                    return 'Unknown';
                }
                return record.date || 'Unknown';
            }
        },
        {
            header: 'In Time',
            accessor: 'inTimes',
            render: (record) => {
                // Safety check for record
                if (!record || typeof record !== 'object') {
                    return <div className="text-green-600">00:00:00</div>;
                }
                
                return (
                    <div>
                        {record.inTimes && Array.isArray(record.inTimes) ? 
                            record.inTimes.map((time, index) => (
                                <div key={index} className="text-green-600">{time || '00:00:00'}</div>
                            )) : 
                            <div className="text-green-600">00:00:00</div>
                        }
                    </div>
                );
            }
        },
        {
            header: 'Out Time',
            accessor: 'outTimes',
            render: (record) => {
                // Safety check for record
                if (!record || typeof record !== 'object') {
                    return <div className="text-red-600">00:00:00</div>;
                }
                
                return (
                    <div>
                        {record.outTimes && Array.isArray(record.outTimes) ? 
                            record.outTimes.map((time, index) => (
                                <div key={index} className="text-red-600">{time || '00:00:00'}</div>
                            )) : 
                            <div className="text-red-600">00:00:00</div>
                        }
                    </div>
                );
            }
        },
        {
            header: 'Duration',
            accessor: 'duration',
            render: (record) => {
                // Safety check for record
                if (!record || typeof record !== 'object') {
                    return '00:00:00';
                }
                return record.duration || '00:00:00';
            }
        }
    ];
    

    return (
        <Fragment>      
            <h1 className='text-2xl font-bold'>Attendance Report</h1>
            <div className='bg-white border rounded-lg p-4'>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <input
                type="text"
                className="form-input"
                placeholder="Search by name..."
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Filter by RFID..."
                value={filterRFID}
                onChange={e => setFilterRFID(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Filter by department..."
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
              />
              <input
                type="date"
                className="form-input"
                placeholder="Filter by date..."
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end mb-6">
              <Button variant="primary" onClick={downloadAttendanceCSV}>
                <FaDownload className="mr-2" /> Download
              </Button>
            </div>
                


                {hasError ? (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                        <p className="text-red-700 font-medium">{errorMessage}</p>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                ) : isLoading ? (
                    <Spinner size="md" variant="default" />
                ) : (
                    <Table
                        columns={columns}
                        data={safeProcessedAttendance}
                        noDataMessage="No attendance records found."
                    />
                )}

            </div>
        </Fragment>
    );
};

export default AttendanceReport;

function processAttendanceByDay(attendanceData) {
    // Handle case where attendanceData is not an array or is empty
    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        return [];
    }
    
    // helper to turn "HH:mm:ss" or "HH:mm:ss AM/PM" → seconds
    function parseTime(t) {
        if (!t || typeof t !== 'string') return 0;
        
        try {
            // Handle AM/PM format
            if (t.includes('AM') || t.includes('PM')) {
                const [time, modifier] = t.split(' ');
                if (!time) return 0;
                let [hours, minutes, seconds] = time.split(':').map(Number);
                hours = hours || 0;
                minutes = minutes || 0;
                seconds = seconds || 0;
                if (modifier && modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                else if (modifier && modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
                return hours * 3600 + minutes * 60 + seconds;
            }
            
            // Handle 24-hour format
            const parts = t.split(':').map(Number);
            const hours = parts[0] || 0;
            const minutes = parts[1] || 0;
            const seconds = parts[2] || 0;
            return hours * 3600 + minutes * 60 + seconds;
        } catch (error) {
            console.warn('Error parsing time:', t, error);
            return 0;
        }
    }

    // helper to format seconds → "HH:mm:ss"
    function formatSecs(sec) {
        if (isNaN(sec) || sec < 0) {
            return '00:00:00';
        }
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return [h, m, s].map(x => String(x).padStart(2, '0')).join(':');
    }

    // Step 1: Create a map to hold all display data, grouped by employee and date.
    const displayGroups = {};
    attendanceData.forEach(record => {
        // Skip invalid records
        if (!record || typeof record !== 'object') return;
        
        // Ensure we have a valid date
        let dateKey = 'Unknown';
        if (record.date) {
            try {
                dateKey = new Date(record.date).toISOString().split('T')[0];
            } catch (e) {
                console.warn('Invalid date format:', record.date);
                dateKey = 'Unknown';
            }
        }
        
        const rfid = record.rfid || 'Unknown';
        const employeeKey = `${rfid}_${dateKey}`;
        
        if (!displayGroups[employeeKey]) {
            displayGroups[employeeKey] = {
                ...record,
                date: dateKey,
                inTimes: [],
                outTimes: [],
                duration: '00:00:00', // Initialize duration
                latestTimestamp: 0,
            };
        }
        
        // Track the latest activity for sorting the final list
        let recordTimestamp = 0;
        if (record.createdAt) {
            try {
                recordTimestamp = new Date(record.createdAt).getTime();
            } catch (e) {
                console.warn('Invalid createdAt format:', record.createdAt);
            }
        }
        displayGroups[employeeKey].latestTimestamp = Math.max(
            displayGroups[employeeKey].latestTimestamp,
            recordTimestamp
        );
        
        // Populate in/out times for display
        if (record.presence !== undefined) {
            const time = record.time || '00:00:00';
            if (record.presence) {
                displayGroups[employeeKey].inTimes.push(time);
            } else {
                displayGroups[employeeKey].outTimes.push(time);
            }
        }
    });

    // Step 2: Group all punches by employee to process them chronologically
    const punchesByRfid = attendanceData.reduce((acc, record) => {
        // Skip records without required data
        if (!record || typeof record !== 'object' || !record.rfid) return acc;
        
        const rfid = record.rfid;
        if (!acc[rfid]) acc[rfid] = [];
        acc[rfid].push(record);
        return acc;
    }, {});

    // Step 3: Process each employee's punches to calculate valid daily durations
    for (const rfid in punchesByRfid) {
        // Sort this employee's punches by time to ensure correct pairing order
        const records = punchesByRfid[rfid].sort((a, b) => {
            let timeA = 0, timeB = 0;
            if (a.createdAt) {
                try {
                    timeA = new Date(a.createdAt).getTime();
                } catch (e) {
                    console.warn('Invalid createdAt format:', a.createdAt);
                }
            }
            if (b.createdAt) {
                try {
                    timeB = new Date(b.createdAt).getTime();
                } catch (e) {
                    console.warn('Invalid createdAt format:', b.createdAt);
                }
            }
            return timeA - timeB;
        });
        
        const inPunchesStack = []; // Use a stack to pair the most recent IN with an OUT
        
        for (const record of records) {
            // Skip records without time data
            if (!record || typeof record !== 'object' || !record.time) continue;
            
            if (record.presence) { // This is an IN punch
                inPunchesStack.push(record);
            } else { // This is an OUT punch
                if (inPunchesStack.length > 0) {
                    const lastIn = inPunchesStack.pop(); // Pair with the most recent IN
                    
                    // Ensure we have valid dates
                    let inDate = 'Unknown', outDate = 'Unknown';
                    try {
                        inDate = lastIn.date ? new Date(lastIn.date).toISOString().split('T')[0] : 'Unknown';
                        outDate = record.date ? new Date(record.date).toISOString().split('T')[0] : 'Unknown';
                    } catch (e) {
                        console.warn('Invalid date format in record');
                    }

                    // Rule: Only calculate duration if it's a same-day pair
                    if (inDate === outDate) {
                        const inSeconds = parseTime(lastIn.time);
                        const outSeconds = parseTime(record.time);
                        
                        if (!isNaN(inSeconds) && !isNaN(outSeconds) && outSeconds > inSeconds) {
                            const duration = outSeconds - inSeconds;
                            const summaryKey = `${rfid}_${inDate}`;
                            
                            // Add the calculated duration to the correct display group
                            if (displayGroups[summaryKey]) {
                                const currentDurationSeconds = parseTime(displayGroups[summaryKey].duration);
                                displayGroups[summaryKey].duration = formatSecs(currentDurationSeconds + duration);
                            }
                        }
                    }
                }
            }
        }
    }

    // Sort the in/out times within each group for clean display
    for (const key in displayGroups) {
        if (displayGroups[key].inTimes && Array.isArray(displayGroups[key].inTimes)) {
            displayGroups[key].inTimes.sort((a,b) => parseTime(a) - parseTime(b));
        }
        if (displayGroups[key].outTimes && Array.isArray(displayGroups[key].outTimes)) {
            displayGroups[key].outTimes.sort((a,b) => parseTime(a) - parseTime(b));
        }
    }

    // Return the processed display groups, sorted to show the most recent activity first
    return Object.values(displayGroups).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
}
