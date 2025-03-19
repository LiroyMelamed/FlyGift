import React from 'react';
import Image from 'next/image';

interface SimpleImageProps {
    src: string;
    alt: string;
    width: number;
    height: number;
}

const SimpleImage: React.FC<SimpleImageProps> = ({ src, alt, width, height }) => {
    return (
        <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            layout="intrinsic" // Adjust layout as needed
        />
    );
};

export default SimpleImage;