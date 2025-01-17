document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = document.getElementById("themeIcon");

  // Check and apply the saved theme from localStorage
  if (localStorage.getItem("theme") === "dark") {
      document.body.classList.add("dark-mode");
      themeIcon.classList.replace("fa-sun", "fa-moon");
  }

  // Toggle theme on button click
  themeToggle.addEventListener("click", () => {
      document.body.classList.toggle("dark-mode");

      if (document.body.classList.contains("dark-mode")) {
          themeIcon.classList.replace("fa-sun", "fa-moon");
          localStorage.setItem("theme", "dark");
      } else {
          themeIcon.classList.replace("fa-moon", "fa-sun");
          localStorage.setItem("theme", "light");
      }
  });
});



  
  
  
  