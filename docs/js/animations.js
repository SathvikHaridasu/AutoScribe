// Animation for the hero section
document.addEventListener('DOMContentLoaded', () => {
    // Hero section entrance animation
    anime.timeline({
        easing: 'easeOutExpo',
    })
    .add({
        targets: '.hero h1',
        opacity: [0, 1],
        translateY: [50, 0],
        duration: 1200
    })
    .add({
        targets: '.tagline',
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 1000
    }, '-=800')
    .add({
        targets: '.cta-buttons a',
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(100),
        duration: 800
    }, '-=600');

    // Animate feature cards on scroll
    const observerFeatures = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                anime({
                    targets: entry.target,
                    scale: [0.9, 1],
                    opacity: [0, 1],
                    translateY: [20, 0],
                    duration: 600,
                    easing: 'easeOutCubic'
                });
                observerFeatures.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        observerFeatures.observe(card);
    });

    // Animate steps on scroll
    const observerSteps = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                anime({
                    targets: entry.target,
                    opacity: [0, 1],
                    translateX: [entry.target.dataset.direction === 'left' ? -30 : 30, 0],
                    duration: 800,
                    easing: 'easeOutCubic'
                });
                observerSteps.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    // Add direction data attribute to steps
    document.querySelectorAll('.step').forEach((step, index) => {
        step.style.opacity = '0';
        step.dataset.direction = index % 2 === 0 ? 'left' : 'right';
        observerSteps.observe(step);
    });

    // Animate nav links hover
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            anime({
                targets: link,
                scale: 1.1,
                duration: 200,
                easing: 'easeOutElastic(1, .8)'
            });
        });
        link.addEventListener('mouseleave', () => {
            anime({
                targets: link,
                scale: 1,
                duration: 200,
                easing: 'easeOutElastic(1, .8)'
            });
        });
    });

    // Floating animation for download button
    anime({
        targets: '.download-button',
        translateY: [-3, 3],
        direction: 'alternate',
        loop: true,
        duration: 1500,
        easing: 'easeInOutSine'
    });

    // Particle background effect
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    document.querySelector('.hero').prepend(particlesContainer);

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particlesContainer.appendChild(particle);

        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const delay = Math.random() * 2000;

        particle.style.left = x + '%';
        particle.style.top = y + '%';

        anime({
            targets: particle,
            opacity: [0, 0.8, 0],
            scale: [0, 1],
            translateX: () => anime.random(-50, 50),
            translateY: () => anime.random(-50, 50),
            delay: delay,
            duration: 3000,
            loop: true,
            easing: 'easeOutExpo'
        });
    }
});

// Interactive typing effect for documentation
const createTypingEffect = (element) => {
    const text = element.textContent;
    element.textContent = '';
    let i = 0;

    const type = () => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, 50);
        }
    };

    type();
};

// Apply typing effect to code blocks when they come into view
const observerCode = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            createTypingEffect(entry.target);
            observerCode.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('code').forEach(code => {
    observerCode.observe(code);
});
