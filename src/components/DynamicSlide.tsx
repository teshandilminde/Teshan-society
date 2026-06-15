import React, { useState, useEffect } from 'react';
import * as Babel from '@babel/standalone';
import * as motion from 'motion/react';
import * as LucideIcons from 'lucide-react';

interface DynamicSlideProps {
  code?: string;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError?: (error: Error) => void;
  fallback: (err: string) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };
  public props!: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("DynamicSlide Render Error:", error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.error?.message || "Unknown error");
    }

    return this.props.children;
  }
}

export function DynamicSlide({ code, onError }: DynamicSlideProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setComponent(null);
      return;
    }

    try {
      // 2. Transpile the code
      const babelOutput = Babel.transform(code, {
        filename: 'slide.tsx',
        presets: [
          'env',
          'react', 
          ['typescript', { isTSX: true, allExtensions: true }]
        ]
      });

      if (!babelOutput || !babelOutput.code) {
         throw new Error("Transpilation failed to produce code object");
      }

      let transpiledCode = babelOutput.code;
      
      const module = { exports: {} as any };
      const exports = module.exports;

      const requireFallback = (moduleName: string) => {
        if (moduleName === 'react') return React;
        if (moduleName === 'motion/react') return motion;
        if (moduleName === 'lucide-react') return LucideIcons;
        return null;
      };

      // Wrap code in a function to execute it and capture exports
      const executableCode = `
        return function(exports, require, module, React) {
           ${transpiledCode}
           return module.exports.default || exports.default;
        }
      `;

      const fn = new Function(executableCode)();
      const ResultComponent = fn(exports, requireFallback, module, React);

      if (ResultComponent) {
        setComponent(() => ResultComponent);
        setErrorDetails(null);
      } else {
         throw new Error("No default export found. Make sure your component uses 'export default function Name() { ... }'");
      }
    } catch (err: any) {
      setComponent(null);
      setErrorDetails(err.message || String(err));
      if (onError) onError(err);
      console.error("DynamicSlide error:", err);
    }
  }, [code, onError]);

  if (errorDetails) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-900/20 text-red-400 p-8">
        <div className="bg-black/50 p-4 rounded-xl max-w-lg border border-red-500/30">
           <h3 className="text-xl font-bold mb-2">Slide Rendering Error</h3>
           <pre className="font-mono text-sm whitespace-pre-wrap">{errorDetails}</pre>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
       <div className="w-full h-full flex items-center justify-center bg-black/20 text-white/40 italic">
          No code content provided.
       </div>
    );
  }

  return (
     <div className="w-full h-full relative overflow-hidden">
        <ErrorBoundary 
           onError={onError}
           fallback={(err) => (
             <div className="w-full h-full flex items-center justify-center bg-red-900/20 text-red-400 p-8">
               <div className="bg-black/50 p-4 rounded-xl max-w-lg border border-red-500/30">
                  <h3 className="text-xl font-bold mb-2">Slide Runtime Error</h3>
                  <pre className="font-mono text-sm whitespace-pre-wrap">{err}</pre>
               </div>
             </div>
           )}
        >
          <Component />
        </ErrorBoundary>
     </div>
  );
}
