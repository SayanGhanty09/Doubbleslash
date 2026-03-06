import React, { useEffect, useRef } from 'react';

const StarBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let stars: Star[] = [];
        const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        class Star {
            x: number;
            y: number;
            size: number;
            baseX: number;
            baseY: number;
            speed: number;
            opacity: number;
            hue: number;

            constructor() {
                if (!canvas) {
                    this.baseX = 0;
                    this.baseY = 0;
                    this.x = 0;
                    this.y = 0;
                    this.size = 0;
                    this.speed = 0;
                    this.opacity = 0;
                    this.hue = 0;
                    return;
                }
                const w = canvas.width;
                const h = canvas.height;
                this.baseX = Math.random() * w;
                this.baseY = Math.random() * h;
                this.x = this.baseX;
                this.y = this.baseY;
                this.size = Math.random() * 2.5 + 0.5; // Larger stars
                // Faster movement for more "heavy" parallax feel
                this.speed = this.size * 3.5;
                this.opacity = Math.random() * 0.7 + 0.3; // More opaque
                this.hue = Math.random() > 0.7 ? 200 : 0; // More blue stars
            }

            update() {
                if (!canvas) return;
                // Increased sensitivity for cursor tracking
                const dx = (mouse.x - canvas.width / 2) / 15;
                const dy = (mouse.y - canvas.height / 2) / 15;

                const targetX = this.baseX + dx * this.speed;
                const targetY = this.baseY + dy * this.speed;

                this.x += (targetX - this.x) * 0.08; // Slightly more elastic movement
                this.y += (targetY - this.y) * 0.08;

                if (Math.random() > 0.98) {
                    this.opacity = Math.random() * 0.5 + 0.4;
                }
            }

            draw() {
                if (!ctx) return;
                ctx.fillStyle = this.hue > 0
                    ? `hsla(${this.hue}, 100%, 85%, ${this.opacity})`
                    : `rgba(255, 255, 255, ${this.opacity})`;

                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                if (this.size > 1.5) {
                    ctx.shadowBlur = 15; // More prominent glow
                    ctx.shadowColor = this.hue > 0 ? '#00d2ff' : 'white';
                } else {
                    ctx.shadowBlur = 0;
                }
            }
        }

        const init = () => {
            if (!canvas) return;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            stars = [];
            const density = 8000; // Increased density (fewer pixels per star)
            const count = Math.floor((canvas.width * canvas.height) / density);

            for (let i = 0; i < count; i++) {
                stars.push(new Star());
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            stars.forEach(star => {
                star.update();
                star.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleResize = () => {
            init();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('resize', handleResize);
        init();
        animate();

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: -1, // Sits above Spline (-2) but behind Shell (0+)
                opacity: 1 // Full opacity
            }}
        />
    );
};

export default StarBackground;
