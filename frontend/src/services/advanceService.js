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

// Function to update an advance voucher
export const updateAdvance = async (advanceId, advanceData) => {
  try {
    const token = getAuthToken();
    // NOTE: Do not add timestamp to PUT requests to avoid routing issues
    const url = `/advances/${advanceId}`;
    
    // Log request details for debugging
    console.log('Making PUT request to:', url);
    console.log('Request data:', advanceData);
    console.log('Base URL:', import.meta.env.VITE_API_URL);
    
    const response = await api.put(url, advanceData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Response received:', response);
    return response.data;
  } catch (error) {
    console.error('Error in updateAdvance:', error);
    console.error('Error response:', error.response);
    
    // Extract backend error message if available
    if (error.response) {
      // Check if we got HTML content instead of JSON (indicating server misconfiguration)
      if (typeof error.response.data === 'string' && error.response.data.includes('<html')) {
        throw new Error('Server configuration error - Please contact system administrator.');
      }
      
      // Server responded with error status
      const errorMessage = error.response.data?.message || 
                          error.response.statusText || 
                          'Failed to update advance voucher';
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - unable to reach server. Please check your connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'Failed to update advance voucher');
    }
  }
};

// Function to delete an advance voucher
export const deleteAdvance = async (advanceId) => {
  try {
    const token = getAuthToken();
    // NOTE: Do not add timestamp to DELETE requests to avoid routing issues
    const url = `/advances/${advanceId}`;
    
    // Log request details for debugging
    console.log('Making DELETE request to:', url);
    console.log('Base URL:', import.meta.env.VITE_API_URL);
    
    const response = await api.delete(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Response received:', response);
    return response.data;
  } catch (error) {
    console.error('Error in deleteAdvance:', error);
    console.error('Error response:', error.response);
    
    // Extract backend error message if available
    if (error.response) {
      // Check if we got HTML content instead of JSON (indicating server misconfiguration)
      if (typeof error.response.data === 'string' && error.response.data.includes('<html')) {
        throw new Error('Server configuration error - Please contact system administrator.');
      }
      
      // Server responded with error status
      const errorMessage = error.response.data?.message || 
                          error.response.statusText || 
                          'Failed to delete advance voucher';
      throw new Error(errorMessage);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error - unable to reach server. Please check your connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'Failed to delete advance voucher');
    }
  }
};