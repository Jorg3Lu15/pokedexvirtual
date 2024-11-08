

// "Informacion" dropdown menu option
document.addEventListener('DOMContentLoaded', function () {
    var dropdownBtn = document.getElementById('info-btn');
    var dropdownContent = document.querySelector('.dropdown-content');

    dropdownBtn.addEventListener('click', function (event) {
        event.preventDefault();  // Evita el comportamiento por defecto del enlace
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    });

    // Para ocultar el dropdown si se hace clic fuera
    window.onclick = function (event) {
        if (!event.target.matches('.dropbtn')) {
            if (dropdownContent.style.display === 'block') {
                dropdownContent.style.display = 'none';
            }
        }
    };
});


/*Earth Animation */
let angle = 0;

    function rotateEarth() {
        angle += 1; // Incrementa el ángulo en 1 grado
        document.getElementById('earthImg').style.transform = `rotate(${angle}deg)`; // Aplica la rotación
        requestAnimationFrame(rotateEarth); // Llama a la función para continuar la animación
    }

    // Inicia la animación cuando la página haya cargado
    window.onload = function() {
        rotateEarth();
    }