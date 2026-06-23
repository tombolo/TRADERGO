import React, { useState, useEffect, useRef } from 'react';
import AIModal from './AIModal';
import './ai-button.scss';

const AIButton = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const hasDragged = useRef(false);
    const initialButtonPos = useRef({ x: 0, y: 0 });

    const handleDragStart = (clientX: number, clientY: number) => {
        if (buttonRef.current) {
            hasDragged.current = false;
            const rect = buttonRef.current.getBoundingClientRect();
            dragStartPos.current = { x: clientX, y: clientY };
            initialButtonPos.current = { x: position.x, y: position.y };
            setDragOffset({
                x: clientX - rect.left,
                y: clientY - rect.top,
            });
            setIsDragging(true);
        }
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
        handleDragStart(e.clientX, e.clientY);
    };

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
        if (e.touches.length > 0) {
            handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    useEffect(() => {
        const handleMove = (clientX: number, clientY: number) => {
            if (!isDragging) return;

            const moveDistance = Math.sqrt(
                Math.pow(clientX - dragStartPos.current.x, 2) + Math.pow(clientY - dragStartPos.current.y, 2)
            );

            if (moveDistance > 5) {
                hasDragged.current = true;
            }

            const deltaX = clientX - dragStartPos.current.x;
            const deltaY = clientY - dragStartPos.current.y;

            setPosition({
                x: initialButtonPos.current.x + deltaX,
                y: initialButtonPos.current.y + deltaY,
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX, e.clientY);
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        const handleEnd = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleEnd);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleEnd);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleEnd);
            };
        }
    }, [isDragging]);

    return (
        <>
            <div
                className='ai-button-wrap'
                style={{
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <span className='ai-button__wave' aria-hidden />
                <span className='ai-button__wave ai-button__wave--2' aria-hidden />
                <span className='ai-button__wave ai-button__wave--3' aria-hidden />
                <span className='ai-button__wave ai-button__wave--4' aria-hidden />
                <span className='ai-button__glow' aria-hidden />
                <button
                    ref={buttonRef}
                    type='button'
                    className='ai-button'
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    onClick={() => {
                        if (!hasDragged.current) {
                            setIsModalOpen(true);
                        }
                    }}
                    style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                >
                    <span className='ai-button__ring' aria-hidden />
                    <span className='ai-button__icon'>✨</span>
                    <span className='ai-button__text'>AI</span>
                </button>
            </div>
            <AIModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};

export default AIButton;
