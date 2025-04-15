import React, { useRef, useEffect } from 'react';
import '../../styles/AnimatedSection.css';

interface AnimatedSectionProps {
    children: React.ReactNode;
    delay?: number;
    triggerPoint?: number;
    scrollY: number;
    sectionY: number;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
    children,
    delay = 0,
    triggerPoint = 300,
    scrollY,
    sectionY = 0
}) => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const animated = useRef(false);

    useEffect(() => {
        if (animated.current) return;

        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > sectionY - triggerPoint || sectionY <= 0) {
                if (sectionRef.current && !animated.current) {
                    sectionRef.current.style.opacity = '1';
                    sectionRef.current.style.transform = 'translateY(0)';
                    animated.current = true;

                    // Remove scroll listener after animation
                    window.removeEventListener('scroll', handleScroll);
                }
            }
        };

        // Initial check in case section is already in view
        if (scrollY > sectionY - triggerPoint || sectionY <= 0) {
            if (sectionRef.current) {
                setTimeout(() => {
                    if (sectionRef.current) {
                        sectionRef.current.style.opacity = '1';
                        sectionRef.current.style.transform = 'translateY(0)';
                    }
                }, delay);
                animated.current = true;
            }
        } else {
            // Add scroll listener
            window.addEventListener('scroll', handleScroll);
        }

        // Clean up
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [scrollY, sectionY, triggerPoint, delay]);

    return (
        <div
            ref={sectionRef}
            className="animated-section"
            style={{
                transform: 'translateY(100px)',
                opacity: 0,
                transition: `transform 800ms ${delay}ms cubic-bezier(0.16, 1, 0.3, 1), 
                    opacity 800ms ${delay}ms cubic-bezier(0.16, 1, 0.3, 1)`
            }}
        >
            {children}
        </div>
    );
};

export default AnimatedSection;