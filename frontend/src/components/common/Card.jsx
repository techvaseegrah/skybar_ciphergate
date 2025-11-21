const Card = ({ 
    children, 
    title, 
    className = '',
    headerClassName = '',
    bodyClassName = ''
  }) => {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md ${className}`}>
        {title && (
          <div className={`px-6 py-4 border-b border-gray-100 ${headerClassName}`}>
            {typeof title === 'string' ? (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            ) : (
              <div className="text-lg font-semibold text-gray-900">{title}</div>
            )}
          </div>
        )}
        <div className={`p-6 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    );
  };
  
  export default Card;