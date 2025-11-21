import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../hooks/useAuth';
import appContext from '../../context/AppContext';
import { requestPasswordResetOtp, resetPasswordWithOtp } from '../../services/authService';
import Spinner from '../../components/common/Spinner';

const AdminLogin = () => {
    const { subdomain } = useContext(appContext);
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
        subdomain
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isForgotPasswordFlow, setIsForgotPasswordFlow] = useState(false);

    // Forgot Password Flow States
    const [subdomainForReset, setSubdomainForReset] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    // Generate floating particles for background animation
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 5
    }));

    useEffect(() => {
      setCredentials(prev => ({ ...prev, subdomain }));
    }, [subdomain]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials({ ...credentials, [name]: value });
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();

        setIsLoading(true);

        try {
            const result = await login(credentials, 'admin');
            localStorage.setItem('tasktracker-subdomain', result.subdomain);
            toast.success('Login successful!');
            
            // Add a small delay to ensure context is updated before navigation
            setTimeout(() => {
                navigate('/admin');
            }, 100);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await requestPasswordResetOtp({ subdomain: subdomainForReset });
            toast.success(response.message);
            setIsOtpSent(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmNewPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await resetPasswordWithOtp({
                subdomain: subdomainForReset,
                otp,
                password: newPassword
            });
            toast.success(response.message);
            setIsForgotPasswordFlow(false); // Go back to login
            setIsOtpSent(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password. Invalid OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 overflow-hidden relative">
            {/* Animated Particles */}
            {particles.map((particle) => (
                <div
                    key={particle.id}
                    className="absolute rounded-full bg-blue-200"
                    style={{ 
                        left: `${particle.x}%`, 
                        top: `${particle.y}%`, 
                        width: `${particle.size}px`, 
                        height: `${particle.size}px`,
                        opacity: 0.1 + Math.random() * 0.2,
                        animation: `float ${particle.duration}s infinite ${particle.delay}s ease-in-out`
                    }}
                />
            ))}
            
            {/* Gradient Orbs */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

            <div className="w-[90%] max-w-md z-10 bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-gray-200 mx-auto glass-effect animate-fade-in">
                <div className="mb-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-md animate-scale-in">
                        <span className="text-white font-bold text-xl">SRC</span>
                    </div>
                    
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 animate-slide-up">
                        {isForgotPasswordFlow ? 'Forgot Password' : 'Admin Login'}
                    </h1>
                    <p className="text-gray-500 mt-2 animate-slide-up-delayed">
                        {isForgotPasswordFlow 
                            ? 'Reset your password to access your account' 
                            : 'Sign in to your admin dashboard'}
                    </p>
                </div>

                {!isForgotPasswordFlow ? (
                    /* Regular Login Form */
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <div className="form-group animate-slide-up-delayed-2">
                          <label htmlFor="username" className="text-gray-700 flex items-center text-sm font-medium mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            Username
                          </label>
                          <input
                            type="text"
                            id="username"
                            name="username"
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 shadow-sm transition-all"
                            value={credentials.username}
                            onChange={handleChange}
                            placeholder="Enter your username"
                            required
                          />
                        </div>
                        
                        <div className="form-group relative animate-slide-up-delayed-3">
                          <label htmlFor="password" className="text-gray-700 flex items-center text-sm font-medium mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              id="password"
                              name="password"
                              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 pr-10 shadow-sm transition-all"
                              value={credentials.password}
                              onChange={handleChange}
                              placeholder="Enter your password"
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md font-medium transform hover:scale-105 active:scale-95"
                        >
                          {isLoading ? <Spinner size="sm" /> : 'Sign In'}
                        </button>
                      </form>
                ) : !isOtpSent ? (
                    /* Forgot Password Step 1: Enter Company Name */
                    <form onSubmit={handleRequestOtp} className="space-y-5">
                        <div className="form-group animate-slide-up-delayed-2">
                            <label htmlFor="subdomain" className="text-gray-700 flex items-center text-sm font-medium mb-2">
                                Company Name
                            </label>
                            <input
                                type="text"
                                id="subdomain"
                                name="subdomain"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 shadow-sm transition-all"
                                value={subdomainForReset}
                                onChange={(e) => setSubdomainForReset(e.target.value)}
                                required
                                placeholder="Enter your company name"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md font-medium transform hover:scale-105 active:scale-95"
                        >
                            {isLoading ? <Spinner size="sm" /> : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                    /* Forgot Password Step 2: Enter OTP and New Password */
                    <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
                        <div className="form-group animate-slide-up-delayed-2">
                            <label htmlFor="otp" className="text-gray-700 flex items-center text-sm font-medium mb-2">
                                OTP
                            </label>
                            <input
                                type="text"
                                id="otp"
                                name="otp"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 shadow-sm transition-all"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                placeholder="Enter the OTP from your email"
                            />
                        </div>

                        <div className="form-group relative animate-slide-up-delayed-3">
                            <label htmlFor="newPassword" className="text-gray-700 flex items-center text-sm font-medium mb-2">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 shadow-sm transition-all"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength="6"
                                placeholder="Enter your new password"
                            />
                        </div>

                        <div className="form-group relative animate-slide-up-delayed-4">
                            <label htmlFor="confirmNewPassword" className="text-gray-700 flex items-center text-sm font-medium mb-2">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmNewPassword"
                                name="confirmNewPassword"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 shadow-sm transition-all"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                required
                                minLength="6"
                                placeholder="Confirm your new password"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md font-medium transform hover:scale-105 active:scale-95"
                        >
                            {isLoading ? <Spinner size="sm" /> : 'Reset Password'}
                        </button>
                    </form>
                )}

                {/* Back to Login Link */}
                <div className="flex justify-between items-center mt-6">
                    <button
                        onClick={() => setIsForgotPasswordFlow(prev => !prev)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                        {isForgotPasswordFlow ? 'Back to Login' : 'Forgot password?'}
                    </button>
                    <Link
                        to="/admin/register"
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                    >
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
