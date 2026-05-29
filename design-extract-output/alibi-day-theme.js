// React Theme — extracted from https://alibi.day
// Compatible with: Chakra UI, Stitches, Vanilla Extract, or any CSS-in-JS

/**
 * TypeScript type definition for this theme:
 *
 * interface Theme {
 *   colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    neutral50: string;
 *   };
 *   fonts: {
    body: string;
    mono: string;
 *   };
 *   fontSizes: {
    '11': string;
    '12': string;
    '13': string;
    '14': string;
    '15': string;
    '16': string;
    '17': string;
    '24': string;
    '30': string;
    '60': string;
    '12.5': string;
 *   };
 *   space: {
    '2': string;
    '40': string;
    '64': string;
    '80': string;
    '123': string;
    '128': string;
    '449': string;
 *   };
 *   radii: {
    lg: string;
 *   };
 *   shadows: {
    sm: string;
 *   };
 *   states: {
 *     hover: { opacity: number };
 *     focus: { opacity: number };
 *     active: { opacity: number };
 *     disabled: { opacity: number };
 *   };
 * }
 */

export const theme = {
  "colors": {
    "primary": "#3253c7",
    "secondary": "#081692",
    "accent": "#0e3b56",
    "background": "#ffffff",
    "foreground": "#162044",
    "neutral50": "#ffffff"
  },
  "fonts": {
    "body": "'Figtree', sans-serif",
    "mono": "'JetBrains Mono', monospace"
  },
  "fontSizes": {
    "11": "11px",
    "12": "12px",
    "13": "13px",
    "14": "14px",
    "15": "15px",
    "16": "16px",
    "17": "17px",
    "24": "24px",
    "30": "30px",
    "60": "60px",
    "12.5": "12.5px"
  },
  "space": {
    "2": "2px",
    "40": "40px",
    "64": "64px",
    "80": "80px",
    "123": "123px",
    "128": "128px",
    "449": "449px"
  },
  "radii": {
    "lg": "16px"
  },
  "shadows": {
    "sm": "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.08) 0px 2px 6px 0px inset"
  },
  "states": {
    "hover": {
      "opacity": 0.08
    },
    "focus": {
      "opacity": 0.12
    },
    "active": {
      "opacity": 0.16
    },
    "disabled": {
      "opacity": 0.38
    }
  }
};

// MUI v5 theme
export const muiTheme = {
  "palette": {
    "primary": {
      "main": "#3253c7",
      "light": "hsl(227, 60%, 64%)",
      "dark": "hsl(227, 60%, 34%)"
    },
    "secondary": {
      "main": "#081692",
      "light": "hsl(234, 90%, 45%)",
      "dark": "hsl(234, 90%, 15%)"
    },
    "background": {
      "default": "#ffffff",
      "paper": "#4a60c6"
    },
    "text": {
      "primary": "#162044",
      "secondary": "#3253c7"
    }
  },
  "typography": {
    "fontFamily": "'JetBrains Mono', sans-serif",
    "h1": {
      "fontSize": "60px",
      "fontWeight": "900",
      "lineHeight": "60px"
    },
    "h2": {
      "fontSize": "24px",
      "fontWeight": "900",
      "lineHeight": "32px"
    },
    "body1": {
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "24px"
    },
    "body2": {
      "fontSize": "15px",
      "fontWeight": "900",
      "lineHeight": "24px"
    }
  },
  "shape": {
    "borderRadius": 16
  },
  "shadows": [
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.06) 0px 1px 3px 0px, rgba(50, 83, 199, 0.09) 0px 6px 20px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.2) 0px 2px 6px 0px, rgba(50, 83, 199, 0.16) 0px 4px 14px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.06) 0px 1px 3px 0px, rgba(50, 83, 199, 0.07) 0px 3px 8px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.08) 0px 2px 6px 0px, rgba(50, 83, 199, 0.12) 0px 12px 32px 0px",
    "rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.05) 0px 1px 2px 0px, rgba(50, 83, 199, 0.08) 0px 2px 5px 0px inset"
  ]
};

export default theme;
