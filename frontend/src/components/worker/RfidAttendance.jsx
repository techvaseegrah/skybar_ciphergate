import React, { useState, useRef, useEffect, useContext } from 'react';
import { FaQrcode, FaExclamationTriangle } from 'react-icons/fa';
import Webcam from "react-webcam";
import jsQR from "jsqr";
import { toast } from 'react-toastify';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import appContext from '../../context/AppContext';
import { putRfidAttendance } from '../../services/attendanceService';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth hook

const RfidAttendance = () => {
    const [worker, setWorker] = useState({ rfid: "" });
    const [qrText, setQrText] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(true); // Start with modal open
    const [isScanning, setIsScanning] = useState(false);
    const webcamRef = useRef(null);
    const inputRef = useRef(null);
    const [isPunching, setIsPunching] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [error, setError] = useState('');
    
    const { subdomain } = useContext(appContext);
    const { user } = useAuth(); // Get current user

    useEffect(() => {
        if (isModalOpen && !confirmAction && inputRef.current) {
            inputRef.current.focus();
        }
    }, [confirmAction, isModalOpen]);

    // QR Code scanning functionality
    useEffect(() => {
        if (isScanning) {
            const interval = setInterval(() => {
                scanQRCode();
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [isScanning]);

    const scanQRCode = () => {
        if (webcamRef.current) {
            const video = webcamRef.current.video;
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                const canvas = document.createElement("canvas");
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const context = canvas.getContext("2d");

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, canvas.width, canvas.height);

                if (code) {
                    setQrText(code.data);
                    setWorker({ rfid: code.data });
                    setIsScanning(false); // Stop scanning after finding QR code
                }
            }
        }
    };

    const handleSubmit = e => {
        e.preventDefault();
        if (!worker.rfid.trim()) {
            toast.error('Please enter or scan an RFID');
            return;
        }
        
        // Worker-specific validation: Check if the RFID belongs to the current worker
        if (user && worker.rfid !== user.rfid) {
            setError('RFID validation failed. Please use your own RFID card for attendance.');
            return;
        }
        
        // For workers, we don't need to determine next action as it will be handled by the backend
        // We'll just show a confirmation modal
        setConfirmAction('Mark Attendance');
        setError(''); // Clear any previous errors
    };

    const handleCancel = () => {
        setConfirmAction(null);
        setWorker({ rfid: "" });
        setError('');
    };

    const handleConfirm = () => {
        setIsPunching(true);
        putRfidAttendance({ rfid: worker.rfid })
            .then(res => {
                toast.success(res.message || 'Attendance marked successfully!');
                setWorker({ rfid: '' });
                setConfirmAction(null);
                setIsModalOpen(false); // Close modal on success
                setError('');
            })
            .catch(err => {
                console.error(err);
                // Handle location validation errors specifically
                if (err.message && err.message.includes('not allowed')) {
                    setError(`Attendance not allowed: ${err.message}`);
                } else if (err.message && err.message.includes('Location validation')) {
                    setError(`Location validation failed: ${err.message}`);
                } else {
                    setError(err.message || 'Failed to mark attendance.');
                }
                toast.error(err.message || 'Failed to mark attendance.');
            })
            .finally(() => {
                setIsPunching(false);
            });
    };

    const toggleScanner = () => {
        setIsScanning(!isScanning);
        if (!isScanning) {
            setQrText("");
            setError('');
        }
    };

    const handleClose = () => {
        setIsModalOpen(false);
        // Reset all states when closing
        setWorker({ rfid: "" });
        setConfirmAction(null);
        setIsScanning(false);
        setQrText("");
        setError('');
    };

    return (
        <Modal
            isOpen={isModalOpen}
            title="RFID Attendance"
            size="md"
            onClose={handleClose}
        >
            {confirmAction ? (
                <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                    <h2 className="text-xl font-semibold mb-4">
                        Confirm Attendance
                    </h2>
                    <p className="mb-4 text-gray-600">
                        Are you sure you want to mark attendance with RFID: <strong>{worker.rfid}</strong>?
                    </p>
                    <div className="flex justify-center space-x-4">
                        <Button variant="outline" onClick={handleCancel} disabled={isPunching}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleConfirm}
                            disabled={isPunching}
                            className="flex items-center justify-center"
                        >
                            {isPunching ? <Spinner size="sm" /> : "Confirm"}
                        </Button>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="mb-4">
                    <div className="form-group mb-4">
                        <label htmlFor="rfid" className="form-label">RFID</label>
                        <input
                            ref={inputRef}
                            type="text"
                            id="rfid"
                            value={worker.rfid}
                            onChange={e => {
                                setWorker({ rfid: e.target.value });
                                setError(''); // Clear error when user types
                            }}
                            placeholder="Enter RFID or scan QR code"
                            className="form-input"
                        />
                    </div>
                    
                    {/* Error message display */}
                    {error && (
                        <div className="mb-4 p-3 text-center text-red-600 bg-red-50 rounded-md border border-red-200">
                            {error}
                        </div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={toggleScanner}
                            className="flex items-center justify-center flex-1"
                        >
                            <FaQrcode className="mr-2" />
                            {isScanning ? "Stop Scanner" : "Scan QR Code"}
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1">
                            Submit
                        </Button>
                    </div>
                    
                    {isScanning && (
                        <div className="mt-4">
                            <Webcam
                                ref={webcamRef}
                                style={{ width: '100%', maxWidth: 400, margin: '0 auto', border: '1px solid #ddd' }}
                                videoConstraints={{ facingMode: 'environment' }}
                            />
                            {qrText && (
                                <div className="mt-2 text-center">
                                    <p className="text-green-600 font-medium">RFID Scanned: {qrText}</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div className="flex items-start">
                            <FaExclamationTriangle className="text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                            <p className="text-sm text-yellow-700">
                                <strong>Note:</strong> Attendance will only be marked if you are within the designated location set by your administrator.
                            </p>
                        </div>
                    </div>
                </form>
            )}
        </Modal>
    );
};

export default RfidAttendance;