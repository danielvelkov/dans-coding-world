export interface Theme {
  text: {
    primary: string;
    secondary: string;
    muted: string;
    error: string;
    warning: string;
  };
  background: {
    base: string;
    surface: string;
    elevated: string;
    inverse: string;
    error: string;
  };
  border: {
    primary: string;
    secondary: string;
    hover: string;
  };
  accent: {
    primary: string;
    hover: string;
    soft: string;
    muted: string;
  };
  shimmer: { base: string; highlight: string };
}
