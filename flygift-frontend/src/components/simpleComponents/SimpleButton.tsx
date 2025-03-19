import React from 'react';

interface SimpleButtonProps {
    onClick: () => void;
    children: React.ReactNode;
    className?: string; // Optional class for styling
    disabled?: boolean; // Optional disabled state
}

const SimpleButton: React.FC<SimpleButtonProps> = ({ onClick, children, className, disabled }) => {
    return (
        <button onClick={onClick} className={className} disabled={disabled}>
            {children}
        </button>
    );
};

export default SimpleButton;