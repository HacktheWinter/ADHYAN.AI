import React, { useEffect, useRef } from 'react';

const ParticleCanvas = ({
  particleCount = 50,
  particleColor = 'rgba(147, 51, 234, 0.4)',
  lineColor = 'rgba(99, 102, 241, 0.12)',
  interactionMode = 'attract', // 'attract' | 'repel' | 'none'
  className = 'absolute inset-0 -z-10 pointer-events-none'
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let isVisible = true;

    // Detect mobile for density adjustment
    const isMobile = window.innerWidth < 768;
    const actualCount = isMobile ? Math.floor(particleCount * 0.4) : particleCount;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    // Mouse tracking (relative to canvas)
    const mouse = {
      x: null,
      y: null,
      radius: 140
    };

    // Particle class
    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 1;
        this.baseX = this.x;
        this.baseY = this.y;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.density = Math.random() * 20 + 10;
      }

      update() {
        // Natural drift
        this.x += this.vx;
        this.y += this.vy;

        // Bounce on boundaries
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse physics interaction
        if (interactionMode !== 'none' && mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < mouse.radius) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const maxDistance = mouse.radius;
            const force = (maxDistance - distance) / maxDistance;

            if (interactionMode === 'attract') {
              const directionX = forceDirectionX * force * 1.5;
              const directionY = forceDirectionY * force * 1.5;
              this.x += directionX;
              this.y += directionY;
            } else if (interactionMode === 'repel') {
              const directionX = forceDirectionX * force * this.density * 0.2;
              const directionY = forceDirectionY * force * this.density * 0.2;
              this.x -= directionX;
              this.y -= directionY;
            }
          }
        }
      }

      draw() {
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
    }

    const particles = [];
    for (let i = 0; i < actualCount; i++) {
      particles.push(new Particle());
    }

    const connect = () => {
      const maxDistance = 120;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const opacity = 1 - dist / maxDistance;
            ctx.strokeStyle = lineColor.replace(')', `, ${opacity})`).replace('rgb', 'rgba');
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      if (!isVisible) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      connect();

      animationFrameId = requestAnimationFrame(animate);
    };

    // Resize handler
    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse event handlers attached to canvas parent or window
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    const parent = canvas.parentElement || window;
    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    // Pause when off-screen for maximum performance
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            cancelAnimationFrame(animationFrameId);
            animate();
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      observer.disconnect();
    };
  }, [particleCount, particleColor, lineColor, interactionMode]);

  return <canvas ref={canvasRef} className={className} />;
};

export default ParticleCanvas;
