import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        'auto-rotate'?: boolean;
        'camera-controls'?: boolean;
        'disable-zoom'?: boolean;
      };
    }
  }
}

export {};
