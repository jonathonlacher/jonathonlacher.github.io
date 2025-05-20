// Table of Contents responsive behavior
document.addEventListener('DOMContentLoaded', function() {
  const tocDetails = document.querySelector('.toc-sticky details');
  const tocSticky = document.querySelector('.toc-sticky');
  if (!tocDetails) return;

  // Function to handle screen size changes
  function handleScreenChange(mediaQuery) {
    // On desktop (large screens)
    if (mediaQuery.matches) {
      // Always keep details open on desktop
      tocDetails.setAttribute('open', '');

      // Calculate the initial position of the TOC
      if (tocSticky) {
        // Get the top position of the content
        const article = document.querySelector('.post');
        if (article) {
          // Ensure TOC aligns with content top when page loads
          const articleTop = article.getBoundingClientRect().top;
          document.documentElement.style.setProperty('--toc-top-position', `${articleTop}px`);
        }
      }
    } else {
      // On mobile, collapse the TOC by default
      tocDetails.removeAttribute('open');
    }
  }

  // Create media query to detect desktop size
  const mediaQuery = window.matchMedia('(min-width: 1200px)');

  // Initial call
  handleScreenChange(mediaQuery);

  // Set up listener for viewport changes
  mediaQuery.addEventListener('change', handleScreenChange);
});
