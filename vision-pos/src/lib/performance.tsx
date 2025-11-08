'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';

// Type definitions for performance monitoring
interface PerformanceStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
}

type AnyFunction = (...args: unknown[]) => unknown;
type AsyncFunction = (...args: unknown[]) => Promise<unknown>;

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Extend Performance interface for memory API
declare global {
  interface Performance {
    memory?: MemoryInfo;
  }
}

// Performance monitoring utility
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  // Measure function execution time
  measureFunction<T extends AnyFunction>(
    fn: T,
    name: string
  ): T {
    return ((...args: Parameters<T>) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      this.recordMetric(name, end - start);
      return result;
    }) as T;
  }

  // Measure async function execution time
  measureAsyncFunction<T extends AsyncFunction>(
    fn: T,
    name: string
  ): T {
    return (async (...args: Parameters<T>) => {
      const start = performance.now();
      const result = await fn(...args);
      const end = performance.now();
      this.recordMetric(name, end - start);
      return result;
    }) as T;
  }

  // Record custom metric
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  // Get performance statistics
  getStats(name: string): PerformanceStats | null {
    const values = this.metrics.get(name) || [];
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  // Start monitoring Core Web Vitals
  startWebVitalsMonitoring() {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    this.observePerformanceEntries('largest-contentful-paint', (entries) => {
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime);
    });

    // First Input Delay (FID)
    this.observePerformanceEntries('first-input', (entries) => {
      entries.forEach(entry => {
        const fidEntry = entry as PerformanceEventTiming;
        const fid = fidEntry.processingStart - fidEntry.startTime;
        this.recordMetric('FID', fid);
      });
    });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    this.observePerformanceEntries('layout-shift', (entries) => {
      entries.forEach(entry => {
        const clsEntry = entry as PerformanceEntry & { 
          hadRecentInput: boolean; 
          value: number; 
        };
        if (!clsEntry.hadRecentInput) {
          clsValue += clsEntry.value;
        }
      });
      this.recordMetric('CLS', clsValue);
    });
  }

  private observePerformanceEntries(
    entryType: string, 
    callback: (entries: PerformanceEntry[]) => void
  ) {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });

    try {
      observer.observe({ entryTypes: [entryType] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // Get all metrics for debugging
  getAllMetrics(): Record<string, PerformanceStats | null> {
    const result: Record<string, PerformanceStats | null> = {};
    this.metrics.forEach((values, name) => {
      result[name] = this.getStats(name);
    });
    return result;
  }
}

// React hook for performance monitoring
export function usePerformanceMonitoring(enabled = process.env.NODE_ENV === 'development') {
  const monitor = useRef<PerformanceMonitor | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;

    monitor.current = PerformanceMonitor.getInstance();
    monitor.current.startWebVitalsMonitoring();

    return () => {
      monitor.current?.disconnect();
    };
  }, [enabled]);

  const measureRender = useCallback((componentName: string) => {
    if (!enabled || !monitor.current) return;

    const start = performance.now();
    return () => {
      const end = performance.now();
      monitor.current?.recordMetric(`render:${componentName}`, end - start);
    };
  }, [enabled]);

  return {
    measureRender,
    recordMetric: monitor.current?.recordMetric.bind(monitor.current),
    getStats: monitor.current?.getStats.bind(monitor.current),
    getAllMetrics: monitor.current?.getAllMetrics.bind(monitor.current)
  };
}

// Debounce utility for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle utility for performance optimization
export function useThrottle<T extends AnyFunction>(
  fn: T,
  delay: number
): T {
  const throttleRef = useRef<boolean>(false);

  return useCallback((...args: Parameters<T>) => {
    if (!throttleRef.current) {
      fn(...args);
      throttleRef.current = true;
      setTimeout(() => {
        throttleRef.current = false;
      }, delay);
    }
  }, [fn, delay]) as T;
}

// Intersection Observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<HTMLElement | null>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, options]);

  return { isIntersecting, hasIntersected };
}

// Lazy loading component wrapper
export function LazyWrapper({ 
  children, 
  fallback = null,
  rootMargin = '50px'
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { hasIntersected } = useIntersectionObserver(ref, { rootMargin });

  return (
    <div ref={ref}>
      {hasIntersected ? children : fallback}
    </div>
  );
}

// Memory leak detection
export function useMemoryLeakDetection(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const startMemory = performance.memory?.usedJSHeapSize;
    
    return () => {
      if (performance.memory && startMemory) {
        const endMemory = performance.memory.usedJSHeapSize;
        const diff = endMemory - startMemory;
        
        if (diff > 1024 * 1024) { // More than 1MB
          console.warn(
            `Potential memory leak in ${componentName}: ${(diff / 1024 / 1024).toFixed(2)}MB`
          );
        }
      }
    };
  }, [componentName]);
}

// Bundle size analyzer (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') return;

  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

  Promise.all([
    ...scripts.map(async (script) => {
      const response = await fetch((script as HTMLScriptElement).src);
      return {
        type: 'script',
        url: (script as HTMLScriptElement).src,
        size: parseInt(response.headers.get('content-length') || '0')
      };
    }),
    ...stylesheets.map(async (link) => {
      const response = await fetch((link as HTMLLinkElement).href);
      return {
        type: 'stylesheet',
        url: (link as HTMLLinkElement).href,
        size: parseInt(response.headers.get('content-length') || '0')
      };
    })
  ]).then(assets => {
    const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
    console.table(assets);
    console.log(`Total bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
  });
}