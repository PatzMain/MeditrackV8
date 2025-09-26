import { useEffect } from 'react';

/**
 * Custom hook to manage body scroll prevention when modals are open
 * Automatically adds/removes 'modal-open' class from body element
 */
export const useModalBodyScroll = (isOpen: boolean = true) => {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.classList.add('modal-open');

      // Store current scroll position to restore later if needed
      const scrollPosition = window.pageYOffset;
      document.body.style.top = `-${scrollPosition}px`;
    }

    // Cleanup function
    return () => {
      if (isOpen) {
        document.body.classList.remove('modal-open');

        // Restore scroll position
        const scrollY = document.body.style.top;
        document.body.style.top = '';

        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      }
    };
  }, [isOpen]);
};

/**
 * Simple version that just manages the modal-open class
 * Use this if you don't need scroll position restoration
 */
export const useSimpleModalBodyScroll = (isOpen: boolean = true) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    }

    return () => {
      if (isOpen) {
        document.body.classList.remove('modal-open');
      }
    };
  }, [isOpen]);
};