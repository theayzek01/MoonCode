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
});
