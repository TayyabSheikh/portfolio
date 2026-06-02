/* ==========================================================================
   Muhammad Tayyab Sheikh - Modern Portfolio Interactive Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. THEME SWITCHER (Dark & Light Mode) ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // Load theme preference from localStorage (Default to dark)
    const savedTheme = localStorage.getItem('theme');

    // Apply theme
    if (savedTheme === 'light') {
        htmlElement.setAttribute('data-theme', 'light');
    } else {
        htmlElement.setAttribute('data-theme', 'dark');
        // We set localStorage to dark if it was null, so it's locked in
        if (!savedTheme) localStorage.setItem('theme', 'dark');
    }

    // Toggle theme callback
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        let newTheme = 'dark';
        
        if (currentTheme === 'dark') {
            newTheme = 'light';
        }
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });


    // --- 2. MOBILE NAVIGATION CONTROLLER ---
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    const toggleMobileMenu = () => {
        mobileNavToggle.classList.toggle('active');
        mobileNavOverlay.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    };

    mobileNavToggle.addEventListener('click', toggleMobileMenu);

    // Close menu when links are clicked
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileNavOverlay.classList.contains('active')) {
                toggleMobileMenu();
            }
        });
    });


    // --- 3. TYPEWRITER EFFECT (Hero Titles) ---
    const typewriterElement = document.getElementById('typewriter');
    const words = [
        "Generative AI Researcher",
        "Deep Learning Researcher",
        "Representation Learning Researcher",
        "Medical AI Researcher"
    ];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    const runTypewriter = () => {
        const currentWord = words[wordIndex];
        
        if (isDeleting) {
            // Delete character
            typewriterElement.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50; // Speed up deleting
        } else {
            // Write character
            typewriterElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 120; // Natural typing speed
        }

        // State evaluation
        if (!isDeleting && charIndex === currentWord.length) {
            // Fully typed, pause at the end
            typingSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            // Fully deleted, move to next word
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typingSpeed = 500; // Pause before typing next word
        }

        setTimeout(runTypewriter, typingSpeed);
    };

    if (typewriterElement) {
        runTypewriter();
    }


    // --- 4. SCROLL SPY & REVEAL ANIMATIONS (Intersection Observer) ---
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-link:not(.connect-btn)');
    const revealElements = document.querySelectorAll('.reveal');

    // Scroll Spy active navigation indicator
    const scrollSpyOptions = {
        root: null,
        rootMargin: '-30% 0px -60% 0px', // Trigger near center-top of viewport
        threshold: 0
    };

    const scrollSpyCallback = (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.getAttribute('id');
                
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${activeId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    const scrollSpyObserver = new IntersectionObserver(scrollSpyCallback, scrollSpyOptions);
    sections.forEach(section => scrollSpyObserver.observe(section));

    // Element Scroll Reveal Animations (AOS replacement)
    const revealOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px', // Trigger slightly before element enters view
        threshold: 0.1
    };

    const revealCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Trigger only once
            }
        });
    };

    const revealObserver = new IntersectionObserver(revealCallback, revealOptions);
    revealElements.forEach(el => revealObserver.observe(el));


    // --- 5. PROJECTS & RESEARCH FILTERING ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Set active class on active filter button
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');

            projectCards.forEach(card => {
                const category = card.getAttribute('data-category');

                if (filterValue === 'all' || category === filterValue) {
                    card.style.display = 'flex';
                    // Trigger fade in micro-transition
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 50);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.95)';
                    // Delay hiding for visual continuity
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });


});
