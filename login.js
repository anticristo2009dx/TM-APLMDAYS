const urlParametro = new URLSearchParams(window.location.search);
if (urlParametro.has('error')) {
    const diverror = document.getElementById('error');
    diverror.style.display = 'block';
    
}

