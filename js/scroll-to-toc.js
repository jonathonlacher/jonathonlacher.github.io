// Adds a button to jump back to TOC on long posts in mobile view
document.addEventListener('DOMContentLoaded', function() {
  // Only create button on posts that have TOC
  const toc = document.querySelector('.toc-sticky');
  if (!toc) return;

  // Create the button element
  const tocButton = document.createElement('button');
  tocButton.classList.add('toc-mobile-button');
  tocButton.setAttribute('aria-label', 'Jump to table of contents');
  tocButton.innerHTML = '📑';
  document.body.appendChild(tocButton);

  // Function to toggle button visibility based on scroll position
  function toggleButtonVisibility() {
    // Show button when scrolled past TOC + 500px (meaning we're deep in content)
    const scrolled = window.scrollY;
    const tocPosition = toc.getBoundingClientRect().top + window.scrollY;

    if (scrolled > (tocPosition + 500) && window.innerWidth < 768) {
      tocButton.classList.add('visible');
    } else {
      tocButton.classList.remove('visible');
    }
  }

  // Scroll to TOC when button is clicked
  tocButton.addEventListener('click', function() {
    toc.scrollIntoView({ behavior: 'smooth' });

    // If TOC is collapsed, expand it
    const tocDetails = toc.querySelector('details');
    if (tocDetails && !tocDetails.hasAttribute('open')) {
      tocDetails.setAttribute('open', '');
    }
  });

  // Check button visibility on scroll and resize
  window.addEventListener('scroll', toggleButtonVisibility);
  window.addEventListener('resize', toggleButtonVisibility);

  // Initial check
  toggleButtonVisibility();
});
