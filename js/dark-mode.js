/**
 * Dark mode handling for jonathonlacher.com
 */
(function() {
  // Check if user has a preference stored
  const currentMode = localStorage.getItem('color-mode');

  // Check for system preference if no stored preference
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Initialize based on current settings
  if (currentMode === 'dark' || (currentMode !== 'light' && prefersDark)) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }

  // Set up listeners for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (localStorage.getItem('color-mode') !== 'light' &&
        localStorage.getItem('color-mode') !== 'dark') {
      if (e.matches) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  });

  // Function to toggle dark mode manually (can be called from a button)
  window.toggleDarkMode = function() {
    if (document.documentElement.classList.contains('dark-mode')) {
      document.documentElement.classList.remove('dark-mode');
      localStorage.setItem('color-mode', 'light');
    } else {
      document.documentElement.classList.add('dark-mode');
      localStorage.setItem('color-mode', 'dark');
    }
  };

  // Function to reset to system preference
  window.resetToSystemPreference = function() {
    localStorage.removeItem('color-mode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };
})();
