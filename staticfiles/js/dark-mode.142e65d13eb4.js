document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
  
    // Check the saved theme in localStorage
    const currentTheme = localStorage.getItem("theme");
    if (currentTheme === "dark") {
      document.body.classList.add("dark-theme");
      themeIcon.classList.replace("fa-sun", "fa-moon");
    }
  
    // Handle theme toggle
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-theme");
  
      if (document.body.classList.contains("dark-theme")) {
        themeIcon.classList.replace("fa-sun", "fa-moon");
        localStorage.setItem("theme", "dark");
      } else {
        themeIcon.classList.replace("fa-moon", "fa-sun");
        localStorage.setItem("theme", "light");
      }
    });
  });
  
  
  
  