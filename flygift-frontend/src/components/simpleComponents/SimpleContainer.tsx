import React from 'react';

interface SimpleContainerProps {
    children: React.ReactNode;
    className?: string; // Optional class prop for custom styles
}

const SimpleContainer: React.FC<SimpleContainerProps> = ({ children, className }) => {
    return (
        <div className={className}>
            {children}
        </div>
    );
};

export default SimpleContainer;