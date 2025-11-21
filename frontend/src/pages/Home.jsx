import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [typingText, setTypingText] = useState('');

  const features = [
    {
      title: 'Performance Tracking',
      description: 'Real-time monitoring of employee productivity and task completion rates.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Workflow Optimization',
      description: 'Intelligent task allocation and process streamlining for enhanced productivity.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      title: 'Advanced Analytics',
      description: 'Deep insights into team performance and productivity trends for strategic decision-making.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  useEffect(() => {
    const featureRotation = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 5000);

    return () => clearInterval(featureRotation);
  }, []);

  useEffect(() => {
    const currentFeature = features[activeFeature];
    let currentIndex = 0;
    
    const typingInterval = setInterval(() => {
      if (currentIndex <= currentFeature.description.length) {
        setTypingText(currentFeature.description.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 50);

    return () => clearInterval(typingInterval);
  }, [activeFeature]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 flex items-center justify-center p-6 overflow-hidden relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zMCAyOGMwLTEuMS45LTIgMi0yaDE2YzEuMSAwIDItLjkgMi0yVjEyYzAtMS4xLS45LTItMi0yaC0xNmMtMS4xIDAtMiAuOS0yIDJ2MTR6IiBzdHJva2U9IiNlMWUxZTEiIHN0cm9rZS13aWR0aD0iMSIvPjwvZz48L3N2Zz4=')] opacity-5"></div>
      
      <div 
        className="relative z-10 max-w-6xl w-full grid md:grid-cols-2 gap-12 bg-white/80 backdrop-blur-xl rounded-3xl p-10 shadow-xl border border-gray-200/50"
      >
        {/* Left Section */}
        <div className="flex flex-col justify-center space-y-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold">SRC</span>
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Sharu Recreation Club
            </h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-semibold text-gray-900">
              Boost Productivity Through Intelligent Workforce Management
            </h2>
            <p className="text-lg text-gray-600">
              Streamline operations, track performance, and enhance collaboration with our comprehensive workforce management solution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/admin/login')}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl font-medium transform hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Admin Portal
            </button>
            
            <button
              onClick={() => navigate('/worker/login')}
              className="px-8 py-4 bg-white text-gray-800 rounded-2xl border border-gray-300 hover:bg-gray-50 transition-all shadow hover:shadow-lg font-medium transform hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Employee Login
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex flex-col space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                onClick={() => setActiveFeature(index)}
                className={`flex flex-col items-center p-4 rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                  activeFeature === index 
                    ? 'bg-blue-50 border border-blue-200 shadow-sm' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className={`mb-3 ${activeFeature === index ? 'text-blue-600' : 'text-gray-500'}`}>
                  {feature.icon}
                </div>
                <h3 className="text-sm font-semibold text-center text-gray-800">{feature.title}</h3>
              </div>
            ))}
          </div>

          <div 
            key={activeFeature}
            className="bg-gray-50 p-6 rounded-2xl border border-gray-200 transition-all duration-300"
          >
            <h2 className="text-xl font-bold mb-3 text-gray-900">
              {features[activeFeature].title}
            </h2>
            <p className="text-gray-600">{typingText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;