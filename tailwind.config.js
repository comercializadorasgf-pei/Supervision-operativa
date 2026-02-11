export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#137fec",
                "primary-dark": "#0b5ec2",
                "background-light": "#f6f7f8",
                "background-dark": "#101922",
                "surface-light": "#ffffff",
                "surface-dark": "#18232e",
                "border-light": "#cfdbe7",
                "border-dark": "#2a3b4d",
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
        },
    },
    plugins: [],
}
