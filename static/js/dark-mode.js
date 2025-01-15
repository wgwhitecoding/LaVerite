const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;

themeToggle.addEventListener('click', () => {
    if (root.hasAttribute('data-theme')) {
        root.removeAttribute('data-theme');
        localStorage.removeItem('theme');
    } else {
        root.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
});

// Apply saved theme on load
if (localStorage.getItem('theme') === 'dark') {
    root.setAttribute('data-theme', 'dark');
}