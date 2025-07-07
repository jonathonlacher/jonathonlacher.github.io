// Table of Contents responsive behavior
document.addEventListener("DOMContentLoaded", function () {
  const tocDetails = document.querySelector(".toc-sticky details");
  const tocSticky = document.querySelector(".toc-sticky");
  if (!tocDetails) return;

  // Get CSS custom property values
  function getCSSVariableValue(variableName) {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variableName)
      .trim();
    // Remove 'px' and return as number
    return parseInt(value.replace("px", ""), 10);
  }

  // Function to handle screen size changes
  function handleScreenChange(mediaQuery) {
    // On desktop (large screens)
    if (mediaQuery.matches) {
      // Always keep details open on desktop
      tocDetails.setAttribute("open", "");

      // Calculate the initial position of the TOC
      if (tocSticky) {
        // Get the top position of the content
        const article = document.querySelector(".post");
        if (article) {
          // Ensure TOC aligns with content top when page loads
          const articleTop = article.getBoundingClientRect().top;
          document.documentElement.style.setProperty(
            "--toc-top-position",
            `${articleTop}px`,
          );
        }
      }
    } else {
      // On mobile, collapse the TOC by default
      tocDetails.removeAttribute("open");
    }
  }

  // Get breakpoint value from CSS variable
  const desktopBreakpoint = getCSSVariableValue("--breakpoint-desktop") || 1200;

  // Create media query to detect desktop size using CSS variable
  const mediaQuery = window.matchMedia(`(min-width: ${desktopBreakpoint}px)`);

  // Initial call
  handleScreenChange(mediaQuery);

  // Set up listener for viewport changes
  mediaQuery.addEventListener("change", handleScreenChange);
});
