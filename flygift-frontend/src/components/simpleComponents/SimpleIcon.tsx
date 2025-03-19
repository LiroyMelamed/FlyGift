import React from 'react';
import SimpleImage from './SimpleImage';

interface SimpleIconProps {
    src: string;
    alt: string;
    size: number; // Size for width and height
}

const SimpleIcon: React.FC<SimpleIconProps> = ({ src, alt, size }) => {
    return (
        <SimpleImage src={src} alt={alt} width={size} height={size} />
    );
};

export default SimpleIcon;