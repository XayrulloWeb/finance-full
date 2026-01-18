import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Custom hook for infinite scrolling
 * @param {Function} callback - Function to load more data
 * @param {boolean} hasMore - Boolean indicating if there is more data to load
 * @param {boolean} isLoading - Boolean indicating if data is currently loading
 * @param {object} options - IntersectionObserver options
 */
export const useInfiniteScroll = (callback, hasMore, isLoading, options = {}) => {
    const observer = useRef();

    const lastElementRef = useCallback((node) => {
        if (isLoading) return;

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore) {
                callback();
            }
        }, options);

        if (node) observer.current.observe(node);
    }, [isLoading, hasMore, callback, options]);

    return lastElementRef;
};
