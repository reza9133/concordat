// ============================================================
// GenLayerLogo — uses the actual GenLayer brand logo image
// Used in Navbar (small, subtle) and Footer
// ============================================================

interface GenLayerLogoProps {
  size?: number;
  className?: string;
  /** 'default' renders the original black logo; 'white' inverts it for dark backgrounds */
  variant?: 'default' | 'white';
}

export function GenLayerLogo({ size = 24, className = '', variant = 'default' }: GenLayerLogoProps) {
  return (
    <img
      src="/genlayer-logo.png"
      alt="GenLayer"
      width={size}
      height={size}
      className={`object-contain select-none ${variant === 'white' ? 'invert brightness-200' : ''} ${className}`}
      draggable={false}
    />
  );
}
