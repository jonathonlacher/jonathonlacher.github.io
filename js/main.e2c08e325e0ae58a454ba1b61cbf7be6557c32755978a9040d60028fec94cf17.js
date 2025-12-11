// Bundled JavaScript for jonathonlacher.com

// Linkable Headers functionality
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const article = document.querySelector(".markdown");
    if (!article) {
      return;
    }

    const headers = article.querySelectorAll("h1, h2, h3, h4, h5, h6");

    headers.forEach((header) => {
      if (header.id) {
        const linkIcon = document.createElement("a");
        linkIcon.href = `#${header.id}`;
        linkIcon.classList.add("header-link-icon");
        linkIcon.setAttribute("aria-label", "Copy link to this section");
        // Use inline SVG for link icon
        linkIcon.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-link"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';

        // Handle both click and touch events
        const handleCopyLink = (event) => {
          event.preventDefault();
          const url =
            window.location.origin + window.location.pathname + "#" + header.id;

          // Modern clipboard API with fallback
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
              .writeText(url)
              .then(() => {
                showCopiedMessage(linkIcon);
              })
              .catch((err) => {
                console.warn("Clipboard API failed, trying fallback:", err);
                fallbackCopyTextToClipboard(url, linkIcon);
              });
          } else {
            // Fallback for older browsers
            fallbackCopyTextToClipboard(url, linkIcon);
          }
        };

        linkIcon.addEventListener("click", handleCopyLink);
        linkIcon.addEventListener("touchend", handleCopyLink);

        header.style.position = "relative"; // To position the icon relative to the header
        header.appendChild(linkIcon);
      }
    });
  });

  // Helper function to show "Copied!" message
  function showCopiedMessage(linkIcon) {
    const originalText = linkIcon.innerHTML;
    linkIcon.innerHTML = "Copied!";
    setTimeout(() => {
      linkIcon.innerHTML = originalText;
    }, 1500);
  }

  // Fallback clipboard function for older browsers
  function fallbackCopyTextToClipboard(text, linkIcon) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        showCopiedMessage(linkIcon);
      } else {
        console.error("Fallback copy failed");
      }
    } catch (err) {
      console.error("Fallback copy error:", err);
    }

    document.body.removeChild(textArea);
  }
})();

// Table of Contents responsive behavior
(function () {
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
    const desktopBreakpoint =
      getCSSVariableValue("--breakpoint-desktop") || 1200;

    // Create media query to detect desktop size using CSS variable
    const mediaQuery = window.matchMedia(`(min-width: ${desktopBreakpoint}px)`);

    // Initial call
    handleScreenChange(mediaQuery);

    // Set up listener for viewport changes
    mediaQuery.addEventListener("change", handleScreenChange);
  });
})();

// Scroll to TOC button for mobile
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    // Only create button on posts that have TOC
    const toc = document.querySelector(".toc-sticky");
    if (!toc) return;

    // Create the button element
    const tocButton = document.createElement("button");
    tocButton.classList.add("toc-mobile-button");
    tocButton.setAttribute("aria-label", "Jump to table of contents");
    tocButton.innerHTML = "📑";
    document.body.appendChild(tocButton);

    // Function to toggle button visibility based on scroll position
    function toggleButtonVisibility() {
      // Show button when scrolled past TOC + 500px (meaning we're deep in content)
      const scrolled = window.scrollY;
      const tocPosition = toc.getBoundingClientRect().top + window.scrollY;

      if (scrolled > tocPosition + 500 && window.innerWidth < 768) {
        tocButton.classList.add("visible");
      } else {
        tocButton.classList.remove("visible");
      }
    }

    // Scroll to TOC when button is clicked
    tocButton.addEventListener("click", function () {
      toc.scrollIntoView({ behavior: "smooth" });

      // If TOC is collapsed, expand it
      const tocDetails = toc.querySelector("details");
      if (tocDetails && !tocDetails.hasAttribute("open")) {
        tocDetails.setAttribute("open", "");
      }
    });

    // Check button visibility on scroll and resize
    window.addEventListener("scroll", toggleButtonVisibility);
    window.addEventListener("resize", toggleButtonVisibility);

    // Initial check
    toggleButtonVisibility();
  });
})();
