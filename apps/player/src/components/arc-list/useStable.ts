import { useCallback, useEffect, useRef } from 'react';

/** 外面嘅 callback 每次 render 都係新嘅：包一層穩定嘅，行（memo）唔使跟住 re-render */
export const useStable = <A extends unknown[]>(callback: (...args: A) => void) => {
    const latest = useRef(callback);
    useEffect(() => {
        latest.current = callback;
    });
    return useCallback((...args: A) => latest.current(...args), []);
};
