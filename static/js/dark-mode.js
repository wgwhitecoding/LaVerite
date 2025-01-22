document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");

  // Check saved theme in localStorage
  const currentTheme = localStorage.getItem("theme");
  if (currentTheme === "dark") {
    document.body.classList.add("dark-mode");
    if (themeIcon) {
      themeIcon.classList.replace("fa-sun", "fa-moon");
    }
  }

  // Toggle dark mode
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");
      if (document.body.classList.contains("dark-mode")) {
        if (themeIcon) {
          themeIcon.classList.replace("fa-sun", "fa-moon");
        }
        localStorage.setItem("theme", "dark");
      } else {
        if (themeIcon) {
          themeIcon.classList.replace("fa-moon", "fa-sun");
        }
        localStorage.setItem("theme", "light");
      }
    });
  }
});


  



  
  
  
  