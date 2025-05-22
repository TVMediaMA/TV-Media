// Mobile menu toggle
const menuToggle = document.getElementById('mobile-menu');
const nav = document.querySelector('nav');

menuToggle.addEventListener('click', () => {
  nav.classList.toggle('active');
});

// Intersection Observer for timeline items
const items = document.querySelectorAll('.timeline-item');

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    } else {
      entry.target.classList.remove('animate'); // repeat on scroll back
    }
  });
}, {
  threshold: 0.2
});

items.forEach(item => observer.observe(item));

(() => {
  const track = document.querySelector('.carousel-track');
  const slides = Array.from(track.children);
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');

  let currentIndex = 1; // Start with second slide centered

  function updateCarousel() {
    const slideWidth = slides[0].getBoundingClientRect().width;
    const offset = -((currentIndex - 1) * (slideWidth * 0.8));
    track.style.transform = `translateX(${offset}px)`;

    slides.forEach((slide, i) => {
      slide.style.opacity = '0.4';
      slide.style.transform = 'scale(0.85)';
    });

    if (slides[currentIndex]) {
      slides[currentIndex].style.opacity = '1';
      slides[currentIndex].style.transform = 'scale(1)';
      slides[currentIndex].focus();
    }
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex === 0) currentIndex = slides.length - 1;
    else currentIndex--;
    updateCarousel();
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex === slides.length - 1) currentIndex = 0;
    else currentIndex++;
    updateCarousel();
  });

  // Click center slide to open preview
  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => {
      if (i === currentIndex) {
        const link = slide.dataset.link;
        if (link) window.open(link, '_blank');
      }
    });
  });

  // Initialize carousel on page load
  window.addEventListener('load', updateCarousel);
})();