let searchIndex;
let searchData;
let selectedIndex = -1;

async function initializeSearch() {
  try {
    const response = await fetch("/index.json");
    searchData = await response.json();

    searchIndex = lunr(function () {
      this.ref("permalink");
      this.field("title", { boost: 10 });
      this.field("description", { boost: 5 });
      this.field("content");

      searchData.forEach((doc) => {
        this.add(doc);
      });
    });
  } catch (error) {
    console.error("Failed to initialize search:", error);
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function decodeHtmlEntities(text) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function extractContext(content, query, maxLength = 120) {
  // Decode HTML entities first
  const cleanContent = decodeHtmlEntities(content);
  const words = query.toLowerCase().split(/\s+/);
  const text = cleanContent.toLowerCase();

  // Find the first occurrence of any search term
  let bestIndex = -1;
  let bestWord = "";

  for (const word of words) {
    const index = text.indexOf(word);
    if (index !== -1 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestWord = word;
    }
  }

  if (bestIndex === -1) {
    // Fallback to description if no match found in content
    return (
      cleanContent.substring(0, maxLength) +
      (cleanContent.length > maxLength ? "..." : "")
    );
  }

  // Extract context around the match
  const start = Math.max(0, bestIndex - 40);
  const end = Math.min(cleanContent.length, bestIndex + bestWord.length + 80);

  let context = cleanContent.substring(start, end);

  // Add ellipsis if we're not at the start/end
  if (start > 0) context = "..." + context;
  if (end < cleanContent.length) context = context + "...";

  return context;
}

function displayResults(results, query) {
  const dropdown = document.getElementById("search-dropdown");

  if (!query || query.length < 2) {
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
    return;
  }

  if (results.length === 0) {
    dropdown.innerHTML =
      '<div class="search-no-results">No results found</div>';
    dropdown.classList.remove("hidden");
    return;
  }

  const html = results
    .slice(0, 5)
    .map((result, index) => {
      const item = searchData.find((post) => post.permalink === result.ref);
      const context = extractContext(item.content, query);

      return `
      <a href="${item.permalink}" class="search-result ${index === selectedIndex ? "selected" : ""}" data-index="${index}">
        <div class="search-result-title">${highlightMatch(item.title, query)}</div>
        <div class="search-result-meta">${formatDate(item.date)}</div>
        <div class="search-result-context">${highlightMatch(context, query)}</div>
      </a>
    `;
    })
    .join("");

  if (results.length > 5) {
    dropdown.innerHTML =
      html +
      '<div class="search-more">...and ' +
      (results.length - 5) +
      " more results</div>";
  } else {
    dropdown.innerHTML = html;
  }

  dropdown.classList.remove("hidden");
}

function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

function performSearch(query) {
  if (!query || query.length < 2 || !searchIndex) {
    const dropdown = document.getElementById("search-dropdown");
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
    selectedIndex = -1;
    return;
  }

  const results = searchIndex.search(query);
  displayResults(results, query);
  selectedIndex = -1;
}

function handleKeyNavigation(e) {
  const dropdown = document.getElementById("search-dropdown");
  const results = dropdown.querySelectorAll(".search-result");

  if (results.length === 0) return;

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
      updateSelection(results);
      break;
    case "ArrowUp":
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelection(results);
      break;
    case "Enter":
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        window.location.href = results[selectedIndex].href;
      }
      break;
    case "Escape":
      closeSearch();
      break;
  }
}

function updateSelection(results) {
  results.forEach((result, index) => {
    if (index === selectedIndex) {
      result.classList.add("selected");
    } else {
      result.classList.remove("selected");
    }
  });
}

function closeSearch() {
  const dropdown = document.getElementById("search-dropdown");
  const input = document.getElementById("search-input");
  dropdown.classList.add("hidden");
  dropdown.innerHTML = "";
  input.value = "";
  selectedIndex = -1;
}

document.addEventListener("DOMContentLoaded", async () => {
  await initializeSearch();

  const searchInput = document.getElementById("search-input");
  const dropdown = document.getElementById("search-dropdown");

  if (!searchInput || !dropdown) return;

  let debounceTimer;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(e.target.value);
    }, 200);
  });

  searchInput.addEventListener("keydown", handleKeyNavigation);

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-widget")) {
      dropdown.classList.add("hidden");
    }
  });

  // Prevent form submission if search is in a form
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
    }
  });
});
