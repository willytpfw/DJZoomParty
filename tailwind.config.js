/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                disco: {
                    dark: '#0a0a0f',
                    darker: '#050508',
                    purple: '#9333ea',
                    pink: '#ec4899',
                    cyan: '#06b6d4',
                    magenta: '#d946ef',
                    neon: '#39ff14',
                    gold: '#fbbf24',
                }
            },
            fontFamily: {
                'orbitron': ['Orbitron', 'sans-serif'],
                'inter': ['Inter', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'float': 'float 6s ease-in-out infinite',
                'disco-spin': 'disco-spin 8s linear infinite',
                'neon-flicker': 'neon-flicker 2s infinite',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px #9333ea, 0 0 10px #9333ea, 0 0 20px #9333ea' },
                    '100%': { boxShadow: '0 0 10px #ec4899, 0 0 20px #ec4899, 0 0 40px #ec4899' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'disco-spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                'neon-flicker': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.8' },
                    '75%': { opacity: '0.9' },
                }
            },
            backgroundImage: {
                'disco-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #ec4899 100%)',
                'neon-gradient': 'linear-gradient(90deg, #9333ea, #ec4899, #06b6d4, #9333ea)',
            }
        },
    },
    plugins: [],
}
