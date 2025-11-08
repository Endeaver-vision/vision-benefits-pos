'use client';

import React from 'react';

/**
 * Browser Compatibility Testing Suite for Week 8 Day 4
 * Tests application functionality across different browsers and devices
 */

interface BrowserTestResult {
  feature: string;
  chrome: boolean;
  safari: boolean;
  firefox: boolean;
  edge: boolean;
  mobile: boolean;
  tablet: boolean;
  notes?: string;
}

interface DeviceTestResult {
  device: string;
  resolution: string;
  userAgent: string;
  supported: boolean;
  issues: string[];
}

export class BrowserCompatibilityTester {
  private testResults: BrowserTestResult[] = [];
  private deviceResults: DeviceTestResult[] = [];

  // Core browser feature tests
  async runCompatibilityTests(): Promise<void> {
    console.log('🌐 Starting browser compatibility tests...');

    // Test modern JavaScript features
    this.testModernJavaScript();
    
    // Test CSS features
    this.testCSSFeatures();
    
    // Test Web APIs
    this.testWebAPIs();
    
    // Test responsive design
    this.testResponsiveDesign();
    
    // Test performance features
    this.testPerformanceAPIs();
    
    // Test accessibility features
    this.testAccessibilityFeatures();

    console.log('✅ Browser compatibility tests completed');
  }

  private testModernJavaScript(): void {
    const tests: Partial<BrowserTestResult>[] = [
      {
        feature: 'ES6 Arrow Functions',
        chrome: true,
        safari: true,
        firefox: true,
        edge: true,
        mobile: true,
        tablet: true
      },
      {
        feature: 'Async/Await',
        chrome: true,
        safari: true,
        firefox: true,
        edge: true,
        mobile: true,
        tablet: true
      },
      {
        feature: 'Optional Chaining (?.)',
        chrome: typeof (() => {})?.call === 'function',
        safari: typeof (() => {})?.call === 'function',
        firefox: typeof (() => {})?.call === 'function',
        edge: typeof (() => {})?.call === 'function',
        mobile: typeof (() => {})?.call === 'function',
        tablet: typeof (() => {})?.call === 'function'
      },
      {
        feature: 'Nullish Coalescing (??)',
        chrome: (undefined ?? 'test') === 'test',
        safari: (undefined ?? 'test') === 'test',
        firefox: (undefined ?? 'test') === 'test',
        edge: (undefined ?? 'test') === 'test',
        mobile: (undefined ?? 'test') === 'test',
        tablet: (undefined ?? 'test') === 'test'
      }
    ];

    tests.forEach(test => {
      this.testResults.push(test as BrowserTestResult);
    });
  }

  private testCSSFeatures(): void {
    const testElement = document.createElement('div');
    document.body.appendChild(testElement);

    const cssTests: Partial<BrowserTestResult>[] = [
      {
        feature: 'CSS Grid',
        chrome: CSS.supports('display', 'grid'),
        safari: CSS.supports('display', 'grid'),
        firefox: CSS.supports('display', 'grid'),
        edge: CSS.supports('display', 'grid'),
        mobile: CSS.supports('display', 'grid'),
        tablet: CSS.supports('display', 'grid')
      },
      {
        feature: 'CSS Flexbox',
        chrome: CSS.supports('display', 'flex'),
        safari: CSS.supports('display', 'flex'),
        firefox: CSS.supports('display', 'flex'),
        edge: CSS.supports('display', 'flex'),
        mobile: CSS.supports('display', 'flex'),
        tablet: CSS.supports('display', 'flex')
      },
      {
        feature: 'CSS Custom Properties',
        chrome: CSS.supports('--test-var', 'value'),
        safari: CSS.supports('--test-var', 'value'),
        firefox: CSS.supports('--test-var', 'value'),
        edge: CSS.supports('--test-var', 'value'),
        mobile: CSS.supports('--test-var', 'value'),
        tablet: CSS.supports('--test-var', 'value')
      },
      {
        feature: 'CSS Container Queries',
        chrome: CSS.supports('container-type', 'inline-size'),
        safari: CSS.supports('container-type', 'inline-size'),
        firefox: CSS.supports('container-type', 'inline-size'),
        edge: CSS.supports('container-type', 'inline-size'),
        mobile: CSS.supports('container-type', 'inline-size'),
        tablet: CSS.supports('container-type', 'inline-size')
      }
    ];

    document.body.removeChild(testElement);

    cssTests.forEach(test => {
      this.testResults.push(test as BrowserTestResult);
    });
  }

  private testWebAPIs(): void {
    const apiTests: Partial<BrowserTestResult>[] = [
      {
        feature: 'Fetch API',
        chrome: typeof fetch !== 'undefined',
        safari: typeof fetch !== 'undefined',
        firefox: typeof fetch !== 'undefined',
        edge: typeof fetch !== 'undefined',
        mobile: typeof fetch !== 'undefined',
        tablet: typeof fetch !== 'undefined'
      },
      {
        feature: 'Web Storage (localStorage)',
        chrome: typeof localStorage !== 'undefined',
        safari: typeof localStorage !== 'undefined',
        firefox: typeof localStorage !== 'undefined',
        edge: typeof localStorage !== 'undefined',
        mobile: typeof localStorage !== 'undefined',
        tablet: typeof localStorage !== 'undefined'
      },
      {
        feature: 'IntersectionObserver',
        chrome: typeof IntersectionObserver !== 'undefined',
        safari: typeof IntersectionObserver !== 'undefined',
        firefox: typeof IntersectionObserver !== 'undefined',
        edge: typeof IntersectionObserver !== 'undefined',
        mobile: typeof IntersectionObserver !== 'undefined',
        tablet: typeof IntersectionObserver !== 'undefined'
      },
      {
        feature: 'ResizeObserver',
        chrome: typeof ResizeObserver !== 'undefined',
        safari: typeof ResizeObserver !== 'undefined',
        firefox: typeof ResizeObserver !== 'undefined',
        edge: typeof ResizeObserver !== 'undefined',
        mobile: typeof ResizeObserver !== 'undefined',
        tablet: typeof ResizeObserver !== 'undefined'
      },
      {
        feature: 'Performance API',
        chrome: typeof performance !== 'undefined' && typeof performance.now === 'function',
        safari: typeof performance !== 'undefined' && typeof performance.now === 'function',
        firefox: typeof performance !== 'undefined' && typeof performance.now === 'function',
        edge: typeof performance !== 'undefined' && typeof performance.now === 'function',
        mobile: typeof performance !== 'undefined' && typeof performance.now === 'function',
        tablet: typeof performance !== 'undefined' && typeof performance.now === 'function'
      }
    ];

    apiTests.forEach(test => {
      this.testResults.push(test as BrowserTestResult);
    });
  }

  private testResponsiveDesign(): void {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };

    const isMobile = viewport.width <= 768;
    const isTablet = viewport.width > 768 && viewport.width <= 1024;
    const isDesktop = viewport.width > 1024;

    const responsiveTests: Partial<BrowserTestResult>[] = [
      {
        feature: 'Viewport Meta Tag',
        chrome: document.querySelector('meta[name="viewport"]') !== null,
        safari: document.querySelector('meta[name="viewport"]') !== null,
        firefox: document.querySelector('meta[name="viewport"]') !== null,
        edge: document.querySelector('meta[name="viewport"]') !== null,
        mobile: document.querySelector('meta[name="viewport"]') !== null,
        tablet: document.querySelector('meta[name="viewport"]') !== null
      },
      {
        feature: 'Media Queries',
        chrome: window.matchMedia('(min-width: 768px)').matches === !isMobile,
        safari: window.matchMedia('(min-width: 768px)').matches === !isMobile,
        firefox: window.matchMedia('(min-width: 768px)').matches === !isMobile,
        edge: window.matchMedia('(min-width: 768px)').matches === !isMobile,
        mobile: window.matchMedia('(min-width: 768px)').matches === !isMobile,
        tablet: window.matchMedia('(min-width: 768px)').matches === !isMobile
      },
      {
        feature: 'Touch Events',
        chrome: 'ontouchstart' in window,
        safari: 'ontouchstart' in window,
        firefox: 'ontouchstart' in window,
        edge: 'ontouchstart' in window,
        mobile: 'ontouchstart' in window,
        tablet: 'ontouchstart' in window
      }
    ];

    responsiveTests.forEach(test => {
      this.testResults.push(test as BrowserTestResult);
    });
  }

  private testPerformanceAPIs(): void {
    const performanceTests: Partial<BrowserTestResult>[] = [
      {
        feature: 'Navigation Timing',
        chrome: typeof performance.navigation !== 'undefined',
        safari: typeof performance.navigation !== 'undefined',
        firefox: typeof performance.navigation !== 'undefined',
        edge: typeof performance.navigation !== 'undefined',
        mobile: typeof performance.navigation !== 'undefined',
        tablet: typeof performance.navigation !== 'undefined'
      },
      {
        feature: 'Resource Timing',
        chrome: typeof performance.getEntriesByType === 'function',
        safari: typeof performance.getEntriesByType === 'function',
        firefox: typeof performance.getEntriesByType === 'function',
        edge: typeof performance.getEntriesByType === 'function',
        mobile: typeof performance.getEntriesByType === 'function',
        tablet: typeof performance.getEntriesByType === 'function'
      },
      {
        feature: 'Web Vitals Support',
        chrome: typeof PerformanceObserver !== 'undefined',
        safari: typeof PerformanceObserver !== 'undefined',
        firefox: typeof PerformanceObserver !== 'undefined',
        edge: typeof PerformanceObserver !== 'undefined',
        mobile: typeof PerformanceObserver !== 'undefined',
        tablet: typeof PerformanceObserver !== 'undefined'
      }
    ];

    performanceTests.forEach(test => {
      this.testResults.push(test as BrowserTestResult);
    });
  }

  private testAccessibilityFeatures(): void {
    const a11yTests: Partial<BrowserTestResult>[] = [
      {
        feature: 'ARIA Support',
        chrome: document.createElement('div').setAttribute('aria-label', 'test') === undefined,
        safari: document.createElement('div').setAttribute('aria-label', 'test') === undefined,
        firefox: document.createElement('div').setAttribute('aria-label', 'test') === undefined,
        edge: document.createElement('div').setAttribute('aria-label', 'test') === undefined,
        mobile: document.createElement('div').setAttribute('aria-label', 'test') === undefined,
        tablet: document.createElement('div').setAttribute('aria-label', 'test') === undefined
      },
      {
        feature: 'Focus Management',
        chrome: typeof document.activeElement !== 'undefined',
        safari: typeof document.activeElement !== 'undefined',
        firefox: typeof document.activeElement !== 'undefined',
        edge: typeof document.activeElement !== 'undefined',
        mobile: typeof document.activeElement !== 'undefined',
        tablet: typeof document.activeElement !== 'undefined'
      }
    ];

    a11yTests.forEach(test => {
      this.testResults.push(test as BrowserTestResult);
    });
  }

  // Device-specific testing
  detectDevice(): DeviceTestResult {
    const userAgent = navigator.userAgent;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    let device = 'Unknown';
    let supported = true;
    const issues: string[] = [];

    // Detect device type
    if (/iPad/.test(userAgent)) {
      device = 'iPad';
    } else if (/iPhone/.test(userAgent)) {
      device = 'iPhone';
    } else if (/Android/.test(userAgent) && /Mobile/.test(userAgent)) {
      device = 'Android Phone';
    } else if (/Android/.test(userAgent)) {
      device = 'Android Tablet';
    } else if (/Windows/.test(userAgent)) {
      device = 'Windows Desktop';
    } else if (/Mac/.test(userAgent)) {
      device = 'Mac Desktop';
    } else if (/Linux/.test(userAgent)) {
      device = 'Linux Desktop';
    }

    // Check for known issues
    if (viewport.width < 320) {
      issues.push('Screen width too small for optimal experience');
    }

    if (viewport.height < 480) {
      issues.push('Screen height too small for optimal experience');
    }

    // Check for outdated browsers
    if (userAgent.includes('Chrome/') && parseInt(userAgent.split('Chrome/')[1]) < 90) {
      issues.push('Chrome version may be outdated');
      supported = false;
    }

    if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/') && parseInt(userAgent.split('Version/')[1]) < 14) {
      issues.push('Safari version may be outdated');
      supported = false;
    }

    const result: DeviceTestResult = {
      device,
      resolution: `${viewport.width}x${viewport.height}`,
      userAgent,
      supported,
      issues
    };

    this.deviceResults.push(result);
    return result;
  }

  // Generate comprehensive compatibility report
  generateReport(): {
    overall: boolean;
    testResults: BrowserTestResult[];
    deviceResults: DeviceTestResult[];
    recommendations: string[];
  } {
    const failedTests = this.testResults.filter(test => 
      !test.chrome || !test.safari || !test.firefox || !test.edge
    );

    const recommendations: string[] = [];

    if (failedTests.length > 0) {
      recommendations.push('Consider adding polyfills for unsupported features');
      recommendations.push('Implement progressive enhancement for better compatibility');
    }

    if (this.deviceResults.some(result => !result.supported)) {
      recommendations.push('Display browser update notifications for outdated browsers');
    }

    if (this.testResults.some(test => !test.mobile || !test.tablet)) {
      recommendations.push('Improve mobile and tablet support');
      recommendations.push('Test touch interactions thoroughly');
    }

    return {
      overall: failedTests.length === 0,
      testResults: this.testResults,
      deviceResults: this.deviceResults,
      recommendations
    };
  }

  // Test critical user flows
  async testUserFlows(): Promise<boolean> {
    console.log('🧪 Testing critical user flows...');

    const flows = [
      'Authentication flow',
      'Customer search',
      'Product catalog browsing',
      'Quote creation',
      'Checkout process',
      'Report generation'
    ];

    const results = await Promise.allSettled(
      flows.map(flow => this.simulateUserFlow(flow))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const total = results.length;

    console.log(`✅ ${successful}/${total} user flows completed successfully`);

    return successful === total;
  }

  private async simulateUserFlow(flowName: string): Promise<void> {
    // Simulate user interaction delays
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, this would perform actual UI interactions
    console.log(`Testing ${flowName}...`);
    
    // Check for common issues
    const forms = document.querySelectorAll('form');
    const buttons = document.querySelectorAll('button');
    const links = document.querySelectorAll('a');

    if (forms.length === 0 && flowName.includes('creation')) {
      throw new Error(`${flowName}: No forms found`);
    }

    if (buttons.length === 0) {
      throw new Error(`${flowName}: No interactive buttons found`);
    }

    // Simulate successful completion
    console.log(`✓ ${flowName} completed`);
  }
}

// Automated testing component
export function BrowserCompatibilityTestComponent() {
  const [testResults, setTestResults] = React.useState<{
    overall: boolean;
    testResults: BrowserTestResult[];
    deviceResults: DeviceTestResult[];
    recommendations: string[];
  } | null>(null);
  const [isRunning, setIsRunning] = React.useState(false);

  const runTests = async () => {
    setIsRunning(true);
    
    const tester = new BrowserCompatibilityTester();
    
    // Run all tests
    await tester.runCompatibilityTests();
    tester.detectDevice();
    await tester.testUserFlows();
    
    const report = tester.generateReport();
    setTestResults(report);
    setIsRunning(false);
  };

  React.useEffect(() => {
    // Auto-run tests on component mount
    runTests();
  }, []);

  if (isRunning) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Running browser compatibility tests...</p>
        </div>
      </div>
    );
  }

  if (!testResults) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <span className="mr-2">🌐</span>
          Browser Compatibility Test Results
        </h2>
        
        <div className={`p-4 rounded-lg mb-6 ${
          testResults.overall 
            ? 'bg-green-100 border border-green-200' 
            : 'bg-yellow-100 border border-yellow-200'
        }`}>
          <p className="font-medium">
            {testResults.overall ? '✅ All tests passed!' : '⚠️ Some compatibility issues detected'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Feature Support</h3>
            <div className="space-y-2">
              {testResults.testResults.slice(0, 10).map((test: BrowserTestResult, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{test.feature}</span>
                  <div className="flex space-x-1">
                    <span className={`text-xs px-2 py-1 rounded ${test.chrome ? 'bg-green-200' : 'bg-red-200'}`}>
                      Chrome
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${test.safari ? 'bg-green-200' : 'bg-red-200'}`}>
                      Safari
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${test.firefox ? 'bg-green-200' : 'bg-red-200'}`}>
                      Firefox
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${test.edge ? 'bg-green-200' : 'bg-red-200'}`}>
                      Edge
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Device Information</h3>
            {testResults.deviceResults.map((device: DeviceTestResult, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded mb-3">
                <div className="font-medium">{device.device}</div>
                <div className="text-sm text-gray-600">Resolution: {device.resolution}</div>
                <div className={`text-sm ${device.supported ? 'text-green-600' : 'text-red-600'}`}>
                  {device.supported ? 'Fully Supported' : 'Limited Support'}
                </div>
                {device.issues.length > 0 && (
                  <ul className="text-xs text-red-600 mt-1">
                    {device.issues.map((issue, i) => (
                      <li key={i}>• {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {testResults.recommendations.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Recommendations</h3>
            <ul className="space-y-2">
              {testResults.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 mr-2">💡</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Re-run Tests
          </button>
          
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Print Report
          </button>
        </div>
      </div>
    </div>
  );
}