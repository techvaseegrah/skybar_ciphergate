import api from './api';
import { getAuthToken } from '../utils/authUtils';

export const recognizeFaceAndMarkAttendance = async (faceEmbedding, subdomain) => {
    const token = getAuthToken();

    try {
        const response = await api.post('/attendance/face-recognition', {
            faceEmbedding,
            subdomain
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return response.data;
    } catch (error) {
        console.error('Failed to recognize face and mark attendance:', error);
        throw error.response?.data || new Error('Failed to recognize face and mark attendance');
    }
};

export default {
    recognizeFaceAndMarkAttendance
};