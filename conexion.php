<?php
$servidor="localhost";
$usuario="root";
$clave="";
$basedatos="usuarios";

$conexion = mysqli_connect($servidor,$usuario,$clave,$basedatos);

// CORRECCIÓN: Agrega paréntesis en el die para que la concatenación funcione
if (!$conexion) {
    die("Error: No se pudo conectar a MySQL. " . mysqli_connect_error());
}

// Asegúrate de que estos nombres coincidan con el atributo 'name' de tu HTML
$user = $_POST['user'];
$password = $_POST['password'];

// Línea 18: Ahora funcionará porque $conexion está validada arriba
$query = mysqli_query($conexion, "SELECT * FROM usuarios1 WHERE NOMBRE = '$user' and PASS_ = '$password'");

$nr = mysqli_num_rows($query);

if ($nr == 1) {
    header("location: prueba.html");
    $fila = mysqli_fetch_array($query);
    if ($fila ['TIPO'] == 2) {
       
    }

} else {
    header("location: login.html?error=1");
}

