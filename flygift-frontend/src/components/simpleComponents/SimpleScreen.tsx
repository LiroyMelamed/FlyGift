import React from 'react';

interface SimpleScreenProps {
    children?: React.ReactNode;
    style?: React.CSSProperties;
}

const SimpleScreen: React.FC<SimpleScreenProps> = ({ children, style }) => {

    const ScreenStyle: React.CSSProperties = {
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        ...style
    };

    return (
        <div style={ScreenStyle}>
            {/* {children} */}
        </div>
    );
};

export default SimpleScreen;