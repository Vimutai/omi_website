/* ===== MAIN JAVASCRIPT - OFF MIND INITIATIVE ===== */

// DOM Content Loaded Event
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeContactForm();
    initializeFAQ();
    initializeBookingForm();
    initializeScrollAnimations();
    handleURLParameters();
});

/* ===== NAVIGATION FUNCTIONALITY ===== */
function initializeNavigation() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking on a link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
}

/* ===== CONTACT FORM FUNCTIONALITY ===== */
function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleContactFormSubmission();
        });
    }
}

function handleContactFormSubmission() {
    const contactForm = document.getElementById('contact-form');
    const contactButton = contactForm?.querySelector('button[type="submit"]');
    
    if (!contactForm) return;

    // Show loading state
    if (contactButton) {
        contactButton.disabled = true;
        contactButton.textContent = 'Sending...';
    }

    // Get form data
    const formData = new FormData(contactForm);
    const contactData = {
        name: sanitizeInput(formData.get('name')),
        email: sanitizeInput(formData.get('email')),
        subject: sanitizeInput(formData.get('subject')),
        message: sanitizeInput(formData.get('message'))
    };

    // Validate form data
    if (!validateContactForm(contactData)) {
        resetContactButton(contactButton);
        return;
    }

    // Send data to backend API
    (async () => {
        try {
            const res = await fetch('https://omiwebsite-production.up.railway.app/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contactData)
            });

            // Always read response as text first (prevents JSON parse error)
            const text = await res.text();
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            let data;
            if (ct.includes('application/json')) {
                try { data = JSON.parse(text); } catch (err) { data = { raw: text }; }
            } else {
                data = { raw: text };
            }

            if (!res.ok) {
                console.error('Server returned error:', res.status, data);
                showAlert(data.error || data.message || `Server error (${res.status})`);
                resetContactButton(contactButton);
                return;
            }

            // Success
            console.log('Contact form submitted:', data);
            contactForm.style.display = 'none';
            
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message';
            successDiv.innerHTML = `
                <div style="background: #d4edda; color: #155724; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
                    <h3 style="margin: 0 0 10px 0; color: #155724;">✅ Message Sent Successfully!</h3>
                    <p style="margin: 0;">Thank you for your message. We'll get back to you soon.</p>
                </div>
            `;
            contactForm.parentNode.insertBefore(successDiv, contactForm);

            // Reset form after delay
            setTimeout(() => {
                contactForm.reset();
                contactForm.style.display = 'block';
                successDiv.remove();
                resetContactButton(contactButton);
            }, 5000);

        } catch (err) {
            console.error('Network / fetch error:', err);
            showAlert('Something went wrong. Please try again later.');
            resetContactButton(contactButton);
        }
    })();
}

function validateContactForm(data) {
    if (!data.name || !data.email || !data.subject || !data.message) {
        showAlert('Please fill in all required fields.', 'error');
        return false;
    }

    if (!isValidEmail(data.email)) {
        showAlert('Please enter a valid email address.', 'error');
        return false;
    }

    return true;
}

function resetContactButton(button) {
    if (button) {
        button.disabled = false;
        button.textContent = 'Send Message';
    }
}

/* ===== FAQ FUNCTIONALITY ===== */
function initializeFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        if (question) {
            question.addEventListener('click', function() {
                const isActive = item.classList.contains('active');
                
                // Close all FAQ items
                faqItems.forEach(otherItem => {
                    otherItem.classList.remove('active');
                });
                
                // Toggle current item
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        }
    });
}

/* ===== BOOKING FORM FUNCTIONALITY ===== */
function initializeBookingForm() {
    const bookingForm = document.getElementById('booking-form');
    const bookingSummary = document.getElementById('booking-summary');
    
    if (bookingForm) {
        // Listen for form changes to update summary
        bookingForm.addEventListener('change', updateBookingSummary);
        bookingForm.addEventListener('input', updateBookingSummary);
        
        // Initialize summary
        updateBookingSummary();
    }
    
    function updateBookingSummary() {
        const formData = new FormData(bookingForm);
        const program = formData.get('program');
        const date = formData.get('date');
        const participants = formData.get('participants');
        
        if (program && date && participants) {
            // Show summary
            if (bookingSummary) {
                bookingSummary.style.display = 'block';
                
                // Update summary content
                const programNames = {
                    'bestie': 'Bestie Program',
                    'ecotherapy': 'Ecotherapy Program',
                    'family-exchange': 'Family Exchange Program'
                };
                
                const programPrices = {
                    'bestie': 299,
                    'ecotherapy': 399,
                    'family-exchange': 499
                };
                
                const basePrice = programPrices[program] || 0;
                const participantCount = parseInt(participants) || 1;
                const totalPrice = basePrice * participantCount;
                
                // Update DOM elements
                updateSummaryElement('summary-program', programNames[program]);
                updateSummaryElement('summary-date', formatDate(date));
                updateSummaryElement('summary-participants', participantCount);
                updateSummaryElement('summary-total', '$' + totalPrice);
            }
        } else {
            // Hide summary if incomplete
            if (bookingSummary) {
                bookingSummary.style.display = 'none';
            }
        }
    }
    
    function updateSummaryElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

/* ===== SCROLL ANIMATIONS ===== */
function initializeScrollAnimations() {
    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerOffset = 90; // Account for fixed header
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Parallax effect for hero image
    const heroImage = document.querySelector('.hero-img');
    if (heroImage) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const parallax = scrolled * 0.3;
            
            heroImage.style.transform = `translateY(${parallax}px)`;
        });
    }
    
    // Fade in animation for elements
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.program-card, .stat-item, .option-content');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

/* ===== URL PARAMETER HANDLING ===== */
function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const program = urlParams.get('program');
    
    // Pre-select program in booking form if specified in URL
    if (program) {
        const programRadio = document.querySelector(`input[name="program"][value="${program}"]`);
        if (programRadio) {
            programRadio.checked = true;
            // Trigger change event to update summary
            programRadio.dispatchEvent(new Event('change'));
        }
    }
}

/* ===== UTILITY FUNCTIONS ===== */

// Input sanitization for security
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove angle brackets to prevent basic XSS
        .substring(0, 1000); // Limit length
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show alert messages
function showAlert(message, type = 'error') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'error' ? '#f56565' : '#48bb78'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
    `;
    alert.textContent = message;
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#alert-animations')) {
        const style = document.createElement('style');
        style.id = 'alert-animations';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Append to body
    document.body.appendChild(alert);
    
    // Remove after 5 seconds
    setTimeout(() => {
        alert.style.animation = 'slideOutRight 0.3s ease-out forwards';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 300);
    }, 5000);
}

// Format phone number
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    
    return phone;
}

// Generate random confirmation number
function generateConfirmationNumber() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'OMI-';
    
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return result;
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* ===== ACCESSIBILITY ENHANCEMENTS ===== */

// Keyboard navigation for custom elements
document.addEventListener('keydown', function(e) {
    // Handle Enter key on buttons that aren't real buttons
    if (e.key === 'Enter') {
        const target = e.target;
        if (target.classList.contains('faq-question') || 
            target.classList.contains('program-option')) {
            target.click();
        }
    }
    
    // Escape key to close mobile menu
    if (e.key === 'Escape') {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (navToggle && navMenu && navMenu.classList.contains('active')) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
        }
    }
});

// Focus management for mobile menu
function manageFocus() {
    const navLinks = document.querySelectorAll('.nav-link');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navMenu && navMenu.classList.contains('active')) {
        // Focus first navigation link when mobile menu opens
        if (navLinks.length > 0) {
            navLinks[0].focus();
        }
    }
}

// Email copy functionality
document.addEventListener('DOMContentLoaded', function() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const email = this.getAttribute('data-email');
            
            // Copy to clipboard
            navigator.clipboard.writeText(email).then(() => {
                // Visual feedback
                const originalText = this.textContent;
                this.textContent = 'Copied!';
                this.classList.add('copied');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy email address');
            });
        });
    });
});