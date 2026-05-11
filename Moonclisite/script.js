// Simple reveal animations on scroll
document.addEventListener('DOMContentLoaded', () => {
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, observerOptions);

    // Elements to animate
    const animateElements = document.querySelectorAll('.feature-card, .hero-content, .hero-visual, .terminal-box');
    
    animateElements.forEach(el => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        el.style.transition = "all 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
        observer.observe(el);
    });

    // Smooth reveal for nav
    const nav = document.querySelector('nav');
    nav.style.transform = "translateY(-100%)";
    nav.style.transition = "transform 0.8s ease";
    setTimeout(() => {
        nav.style.transform = "translateY(0)";
    }, 100);
    // Terminal Typewriter Simulation
    const terminalBody = document.getElementById('terminal-body');
    const session = [
        { type: 'input', text: 'moon' },
        { type: 'output', text: 'Moon v11.5.2026-3 (Lunar Zen)' },
        { type: 'input', text: 'create a high-end react login...' },
        { type: 'output', text: '🔍 Scanning workspace...' },
        { type: 'output', text: '🦋 Generating Login.tsx...' },
        { type: 'output', text: '✨ Operation successful in 1.4s.' }
    ];

    async function typeText(element, text, speed = 50) {
        for (let i = 0; i < text.length; i++) {
            element.innerHTML += text.charAt(i);
            await new Promise(r => setTimeout(r, speed));
        }
    }

    async function runSimulation() {
        if (!terminalBody) return;
        terminalBody.innerHTML = '';
        for (const line of session) {
            const div = document.createElement('div');
            div.className = 'line';
            if (line.type === 'input') {
                div.innerHTML = '<span class="prompt">$ </span>';
                terminalBody.appendChild(div);
                await typeText(div, line.text, 60);
            } else {
                terminalBody.appendChild(div);
                await typeText(div, line.text, 20);
            }
            await new Promise(r => setTimeout(r, 800));
        }
        const cursor = document.createElement('div');
        cursor.className = 'line cursor';
        terminalBody.appendChild(cursor);
        setTimeout(runSimulation, 4000);
    }

    runSimulation();
});
