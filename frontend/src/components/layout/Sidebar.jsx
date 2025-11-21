import { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { FiLogOut } from "react-icons/fi";
import appContext from '../../context/AppContext';

const Sidebar = ({
  links,
  user,
  onLogout
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedDropdowns, setExpandedDropdowns] = useState({});
  const location = useLocation();

  const { subdomain } = useContext(appContext);

  // Add classes to body based on sidebar state
  useEffect(() => {
    // Function to update body classes
    const updateBodyClasses = () => {
      if (window.innerWidth < 768) {
        // On mobile, remove sidebar state classes
        document.body.classList.remove('sidebar-collapsed', 'sidebar-expanded');
      } else {
        // On desktop, ensure classes are set correctly
        if (isCollapsed) {
          document.body.classList.add('sidebar-collapsed');
          document.body.classList.remove('sidebar-expanded');
        } else {
          document.body.classList.add('sidebar-expanded');
          document.body.classList.remove('sidebar-collapsed');
        }
      }
    };

    // Set initial state
    updateBodyClasses();

    // Handle resize events
    const handleResize = () => {
      updateBodyClasses();
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // Cleanup on unmount
      document.body.classList.remove('sidebar-collapsed', 'sidebar-expanded');
    };
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

  const toggleDropdown = (key) => {
    setExpandedDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isAnyChildActive = (children) => {
    return children.some(child => location.pathname === child.to);
  };

  // Determine sidebar width based on collapsed state
  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300 transition-all duration-200 backdrop-blur-sm bg-white/80 shadow-sm"
        onClick={toggleSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <FaBars className="h-5 w-5" />
      </button>

      {/* Collapse/Expand button - visible on desktop */}
      <button
        type="button"
        className={`hidden md:flex fixed top-1/2 transform -translate-y-1/2 z-40 p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300 transition-all duration-300 backdrop-blur-sm bg-white/80 shadow-sm sidebar-collapse-btn ${
          isCollapsed ? 'left-16' : 'left-64'
        }`}
        onClick={toggleCollapse}
      >
        <span className="sr-only">{isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
        {isCollapsed ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        )}
      </button>

      {/* Sidebar Backdrop */}
      <div 
        className={`fixed inset-0 z-40 transition-opacity duration-300 ease-in-out md:hidden ${
          isOpen ? 'opacity-40 bg-gray-800 pointer-events-auto' : 'opacity-0 bg-gray-800 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 ${sidebarWidth} bg-white/90 backdrop-blur-xl border-r border-gray-200/50 transition-all duration-300 ease-in-out transform overflow-hidden shadow-lg ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } rounded-r-2xl`}
      >
        {/* Logo and close button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200/50">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold text-sm">SRC</span>
            </div>
            {!isCollapsed && (
              <span className="ml-3 text-lg font-semibold text-gray-800 truncate">Sharu Recreation Club</span>
            )}
          </div>
          <button
            type="button"
            className="md:hidden p-1 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-300 transition-colors duration-200"
            onClick={toggleSidebar}
          >
            <span className="sr-only">Close sidebar</span>
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* User profile */}
        {user && !isCollapsed && (
          <div className="px-4 py-4 border-b border-gray-200/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-10 w-10 rounded-xl object-cover border border-gray-200/50 shadow-sm"
                  src={user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username)}`}
                  alt={user.name || user.username}
                />
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name || user.username}</p>
                <p className="text-xs text-gray-500 truncate">{user.department || user.role} - {subdomain}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className={`mt-4 px-2 space-y-1 overflow-y-auto h-[calc(100vh-140px)] pb-24 ${isCollapsed ? 'px-1' : ''}`}>
          {links.map((link, index) => {
            // Handle header items
            if (link.isHeader) {
              return (
                !isCollapsed && (
                  <div key={`header-${index}`} className="pt-4 pb-2">
                    <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {link.label}
                    </h3>
                  </div>
                )
              );
            }
            
            // Handle dropdown items
            if (link.isDropdown) {
              const dropdownKey = `dropdown-${index}`;
              const isExpanded = expandedDropdowns[dropdownKey];
              const hasActiveChild = isAnyChildActive(link.children || []);
              
              return (
                <div key={dropdownKey} className="mb-1">
                  <button
                    onClick={() => {
                      if (!isCollapsed) toggleDropdown(dropdownKey);
                    }}
                    className={`
                      group w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'} text-sm font-medium rounded-xl
                      transition-all duration-200 ease-in-out
                      hover:bg-gray-100/80 hover:shadow-sm
                      ${hasActiveChild 
                        ? 'bg-gray-100/80 text-gray-900 shadow-sm' 
                        : 'text-gray-700'
                      }
                    `}
                  >
                    {link.icon && (
                      <span className={`${isCollapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'} flex items-center justify-center text-gray-500`}>
                        {link.icon}
                      </span>
                    )}
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{link.label}</span>
                        {link.badge && (
                          <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                            {link.badge}
                          </span>
                        )}
                        <span className={`ml-2 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                          <FaChevronDown className="h-4 w-4 text-gray-400" />
                        </span>
                      </>
                    )}
                  </button>
                  
                  {/* Dropdown children with smooth animation */}
                  {!isCollapsed && (
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isExpanded ? 'max-h-60 opacity-100 mt-1' : 'max-h-0 opacity-0'
                      }`}
                    >
                      <div className="pl-9 space-y-1">
                        {link.children?.map((child) => (
                          <Link
                            key={child.to}
                            to={child.to}
                            className={`
                              group flex items-center px-3 py-2 text-sm rounded-lg
                              transition-all duration-200 ease-in-out
                              hover:bg-gray-100/80 hover:shadow-sm
                              ${location.pathname === child.to 
                                ? 'bg-blue-50/80 text-blue-700 border-l-2 border-blue-500 shadow-sm' 
                                : 'text-gray-600'
                              }
                            `}
                            onClick={closeSidebar}
                          >
                            {child.icon && (
                              <span className="mr-3 h-4 w-4 flex items-center justify-center text-gray-400">
                                {child.icon}
                              </span>
                            )}
                            <span className="flex-1">{child.label}</span>
                            {child.badge && (
                              <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                {child.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            
            // Handle regular navigation items
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`
                  group flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'} text-sm font-medium rounded-xl
                  transition-all duration-200 ease-in-out
                  hover:bg-gray-100/80 hover:shadow-sm hover:scale-[1.02]
                  ${location.pathname === link.to 
                    ? 'bg-blue-50/80 text-blue-700 shadow-sm' 
                    : 'text-gray-700'
                  }
                `}
                onClick={closeSidebar}
              >
                {link.icon && (
                  <span className={`${isCollapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'} flex items-center justify-center text-gray-500`}>
                    {link.icon}
                  </span>
                )}
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{link.label}</span>
                    {link.badge && (
                      <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        {onLogout && (
          <div className="absolute bottom-0 w-full px-2 py-4 border-t border-gray-200/50 bg-white/80 backdrop-blur-sm">
            <button
              onClick={onLogout}
              className={`
                group w-full flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'px-3 py-2.5'} text-sm font-medium text-gray-700 rounded-xl 
                hover:bg-red-50/80 hover:shadow-sm hover:scale-[1.02] transition-all duration-200 ease-in-out
              `}
            >
              <span className={`${isCollapsed ? 'h-6 w-6' : 'mr-3 h-5 w-5'} flex items-center justify-center text-gray-500`}>
                <FiLogOut />
              </span>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;