document.addEventListener("DOMContentLoaded", () => {
  const article = document.querySelector(".markdown"); // Adjust if your content container is different
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
      // Try to use Feather icons with fallback
      if (
        typeof feather !== "undefined" &&
        feather.icons &&
        feather.icons.link
      ) {
        linkIcon.innerHTML = feather.icons.link.toSvg({
          width: 16,
          height: 16,
        });
      } else {
        // Fallback to Unicode symbol if Feather icons fail to load
        linkIcon.innerHTML = "🔗";
        linkIcon.style.fontSize = "14px";
      }

      linkIcon.addEventListener("click", (event) => {
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
      });

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
