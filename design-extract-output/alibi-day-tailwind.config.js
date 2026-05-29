/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
    colors: {
        primary: {
            '50': 'hsl(227, 60%, 97%)',
            '100': 'hsl(227, 60%, 94%)',
            '200': 'hsl(227, 60%, 86%)',
            '300': 'hsl(227, 60%, 76%)',
            '400': 'hsl(227, 60%, 64%)',
            '500': 'hsl(227, 60%, 50%)',
            '600': 'hsl(227, 60%, 40%)',
            '700': 'hsl(227, 60%, 32%)',
            '800': 'hsl(227, 60%, 24%)',
            '900': 'hsl(227, 60%, 16%)',
            '950': 'hsl(227, 60%, 10%)',
            DEFAULT: '#3253c7'
        },
        secondary: {
            '50': 'hsl(234, 90%, 97%)',
            '100': 'hsl(234, 90%, 94%)',
            '200': 'hsl(234, 90%, 86%)',
            '300': 'hsl(234, 90%, 76%)',
            '400': 'hsl(234, 90%, 64%)',
            '500': 'hsl(234, 90%, 50%)',
            '600': 'hsl(234, 90%, 40%)',
            '700': 'hsl(234, 90%, 32%)',
            '800': 'hsl(234, 90%, 24%)',
            '900': 'hsl(234, 90%, 16%)',
            '950': 'hsl(234, 90%, 10%)',
            DEFAULT: '#081692'
        },
        accent: {
            '50': 'hsl(203, 72%, 97%)',
            '100': 'hsl(203, 72%, 94%)',
            '200': 'hsl(203, 72%, 86%)',
            '300': 'hsl(203, 72%, 76%)',
            '400': 'hsl(203, 72%, 64%)',
            '500': 'hsl(203, 72%, 50%)',
            '600': 'hsl(203, 72%, 40%)',
            '700': 'hsl(203, 72%, 32%)',
            '800': 'hsl(203, 72%, 24%)',
            '900': 'hsl(203, 72%, 16%)',
            '950': 'hsl(203, 72%, 10%)',
            DEFAULT: '#0e3b56'
        },
        'neutral-50': '#ffffff',
        background: '#ffffff',
        foreground: '#162044'
    },
    fontFamily: {
        sans: [
            'Figtree',
            'sans-serif'
        ],
        body: [
            'JetBrains Mono',
            'sans-serif'
        ]
    },
    fontSize: {
        '11': [
            '11px',
            {
                lineHeight: '17.6px',
                letterSpacing: '1.32px'
            }
        ],
        '12': [
            '12px',
            {
                lineHeight: '16px',
                letterSpacing: '1.44px'
            }
        ],
        '13': [
            '13px',
            {
                lineHeight: '20.8px'
            }
        ],
        '14': [
            '14px',
            {
                lineHeight: '22.4px'
            }
        ],
        '15': [
            '15px',
            {
                lineHeight: '24px',
                letterSpacing: '-0.375px'
            }
        ],
        '16': [
            '16px',
            {
                lineHeight: '24px'
            }
        ],
        '17': [
            '17px',
            {
                lineHeight: '27.2px'
            }
        ],
        '24': [
            '24px',
            {
                lineHeight: '32px',
                letterSpacing: '-0.6px'
            }
        ],
        '30': [
            '30px',
            {
                lineHeight: '36px',
                letterSpacing: '-0.75px'
            }
        ],
        '60': [
            '60px',
            {
                lineHeight: '60px',
                letterSpacing: '-1.5px'
            }
        ],
        '12.5': [
            '12.5px',
            {
                lineHeight: '24px'
            }
        ]
    },
    spacing: {
        '1': '2px',
        '20': '40px',
        '32': '64px',
        '40': '80px',
        '64': '128px',
        '123px': '123px',
        '449px': '449px'
    },
    borderRadius: {
        lg: '16px'
    },
    boxShadow: {
        sm: 'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(50, 83, 199, 0.08) 0px 2px 6px 0px inset'
    },
    transitionDuration: {
        '150': '0.15s'
    },
    transitionTimingFunction: {
        custom: 'cubic-bezier(0.4, 0, 0.2, 1)'
    },
    container: {
        center: true,
        padding: '24px'
    },
    maxWidth: {
        container: '1152px'
    }
},
  },
};
