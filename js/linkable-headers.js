document.addEventListener('DOMContentLoaded', () => {
    const article = document.querySelector('.markdown'); // Adjust if your content container is different
    if (!article) {
        return;
    }

    const headers = article.querySelectorAll('h1, h2, h3, h4, h5, h6');

    headers.forEach(header => {
        if (header.id) {
            const linkIcon = document.createElement('a');
            linkIcon.href = `#${header.id}`;
            linkIcon.classList.add('header-link-icon');
            linkIcon.setAttribute('aria-label', 'Copy link to this section');
            linkIcon.innerHTML = feather.icons.link.toSvg({ width: 16, height: 16 }); // Using Feather icons

            linkIcon.addEventListener('click', (event) => {
                event.preventDefault();
                const url = window.location.origin + window.location.pathname + '#' + header.id;
                navigator.clipboard.writeText(url).then(() => {
                    // Optional: Show a "Copied!" message
                    const originalText = linkIcon.innerHTML;
                    linkIcon.innerHTML = 'Copied!';
                    setTimeout(() => {
                        linkIcon.innerHTML = originalText;
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy link: ', err);
                });
            });

            header.style.position = 'relative'; // To position the icon relative to the header
            header.appendChild(linkIcon);
        }
    });
});
