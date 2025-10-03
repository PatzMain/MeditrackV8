import { useEffect } from 'react';

/**
 * Custom hook to handle modal scroll locking and positioning
 * Ensures modal is centered and visible on mobile devices
 */
export const useModalScrollLock = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    // Save current scroll position
    const scrollY = window.scrollY;
    const body = document.body;

    // Add modal-open class and lock scroll
    body.classList.add('modal-open');

    // On mobile, scroll to top to ensure modal is visible
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // Smooth scroll to top when modal opens
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Store scroll position for restoration
    body.style.top = `-${scrollY}px`;

    // Cleanup function
    return () => {
      body.classList.remove('modal-open');
      body.style.top = '';

      // Restore scroll position when modal closes
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
};
