declare namespace JSX {
  interface IntrinsicElements {
    'model-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        'animation-name'?: string;
        autoplay?: boolean | string;
        'auto-rotate'?: boolean | string;
        'camera-controls'?: boolean | string;
        'interaction-prompt'?: string;
        'shadow-intensity'?: string;
        exposure?: string;
        style?: React.CSSProperties;
        className?: string;
      },
      HTMLElement
    >;
  }
}
