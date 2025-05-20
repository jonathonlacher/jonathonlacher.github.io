document.addEventListener('DOMContentLoaded', function() {
    const summaries = document.querySelectorAll('details > summary');
    summaries.forEach(summary => {
        // Check if the text isn't already there to prevent multiple appends on reloads/navigation
        if (!summary.textContent.includes('(click to expand)')) {
            summary.innerHTML += ' (click to expand)';
        }
    });
});
