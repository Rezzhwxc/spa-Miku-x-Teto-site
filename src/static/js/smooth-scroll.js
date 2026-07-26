let currentY = window.scrollY; 
let targetY = window.scrollY;  
const speed = 0.08; // Smoothing factor (lower = smoother)

let isAnimating = false;

// Check if the target element or its parents have their own scrollbar
function hasInternalScroll(el) {
    while (el && el !== document.body && el !== document.documentElement) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        
        if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
            return true;
        }
        el = el.parentElement;
    }
    return false;
}

function smoothScroll() {
    const distance = targetY - currentY;
    
    currentY += distance * speed;
    window.scrollTo(0, currentY);

    if (Math.abs(distance) > 0.5) {
        requestAnimationFrame(smoothScroll);
    } else {
        isAnimating = false;
        currentY = targetY; 
    }
}

window.addEventListener('wheel', (e) => {
    // Let the browser handle internal scrollable elements
    if (hasInternalScroll(e.target)) {
        currentY = window.scrollY;
        targetY = window.scrollY;
        return; 
    }

    e.preventDefault(); 
    
    targetY += e.deltaY;
    
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    targetY = Math.max(0, Math.min(targetY, maxScroll));

    if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(smoothScroll);
    }
}, { passive: false });