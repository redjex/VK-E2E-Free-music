// Menu Toggle Functionality
const menuToggle = document.getElementById('menuToggle');
const sidebarMenu = document.getElementById('sidebarMenu');

menuToggle.addEventListener('click', function() {
    sidebarMenu.classList.toggle('active');
    menuToggle.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    if (!sidebarMenu.contains(event.target) && !menuToggle.contains(event.target)) {
        sidebarMenu.classList.remove('active');
        menuToggle.classList.remove('active');
    }
});