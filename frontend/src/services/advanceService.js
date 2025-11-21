import api from './api';
import { getAuthToken } from '../utils/authUtils';

export const createAdvanceVoucher = async (advanceData) => {
  try {
    const token = getAuthToken();
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await api.post(`/advances?_t=${timestamp}`, advanceData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to create advance voucher');
  }
};

export const getAdvanceVouchers = async () => {
  try {
    const token = getAuthToken();
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await api.get(`/advances?_t=${timestamp}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to fetch advance vouchers');
  }
};

export const getWorkerAdvances = async (workerId) => {
  try {
    const token = getAuthToken();
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await api.get(`/advances/worker/${workerId}?_t=${timestamp}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to fetch worker advances');
  }
};

// New function for partial advance deduction
export const deductAdvance = async (advanceId, deductionData) => {
  try {
    const token = getAuthToken();
    // Add timestamp to prevent caching
    const timestamp = new Date().getTime();
    const response = await api.post(`/advances/${advanceId}/deduct?_t=${timestamp}`, deductionData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to deduct advance amount');
  }
};