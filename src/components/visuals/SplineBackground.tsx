// @ts-nocheck
import React from 'react';


declare global {
    namespace JSX {
        interface IntrinsicElements {
            'spline-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { url?: string }, HTMLElement>;
        }
    }
}

const SplineBackground: React.FC = () => {
    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: -2,
                pointerEvents: 'none',
                overflow: 'hidden',
                background: 'transparent'
            }}
        >
            <spline-viewer
                url="https://prod.spline.design/DvCAvMEkJp7aZPIg/scene.splinecode"
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '100vw',
                    height: '100vh',
                    transform: 'translate(-50%, -50%) scale(1.5)', // Increased scale
                    display: 'block',
                    opacity: 0.6
                }}
            />
        </div>
    );
};

export default SplineBackground;
