<?php
require_once __DIR__ . '/../repository/usuario_repository.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $ci = trim($_POST['ci'] ?? '');
    $nombre = trim($_POST['name'] ?? '');
    $apellido = trim($_POST['surname'] ?? '');
    $telefono = trim($_POST['telefono'] ?? '') ?: null;
    $direccion = trim($_POST['direccion'] ?? '') ?: null;
    $fechaNac = trim($_POST['fecha_nac'] ?? '') ?: null;
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm-password'] ?? '';
    $rol = $_POST['rol_usuario'] ?? '';

    if (empty($ci) || empty($nombre) || empty($apellido) || empty($email) || empty($password) || empty($rol)) {
        header('Location: ../frontend/paginas/register/register.html?error=' . urlencode('Todos los campos son obligatorios.'));
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header('Location: ../frontend/paginas/register/register.html?error=' . urlencode('Email inválido.'));
        exit;
    }
    if ($password !== $confirmPassword) {
        header('Location: ../frontend/paginas/register/register.html?error=' . urlencode('Las contraseñas no coinciden.'));
        exit;
    }

    $repo = new UsuarioRepository();

    if ($repo->existeEmail($email)) {
        header('Location: ../frontend/paginas/register/register.html?error=' . urlencode('Ya existe un usuario con ese email.'));
        exit;
    }
    if ($repo->existeCi($ci)) {
        header('Location: ../frontend/paginas/register/register.html?error=' . urlencode('Ya existe un usuario con esa cédula.'));
        exit;
    }

    $usuario = new Usuario($ci, $nombre, $apellido, $telefono, $direccion, $fechaNac, $email, $password, $rol);

    if ($repo->registrar($usuario)) {
        switch ($rol) {
            case 'organizador':
                $repo->crearOrganizador($ci);
                break;
            case 'participante':
                $repo->crearParticipante($ci);
                break;
            case 'observador':
                $repo->crearObservador($ci);
                break;
        }
        header('Location: ../frontend/index.html');
        exit;
    } else {
        header('Location: ../frontend/paginas/register/register.html?error=' . urlencode('Error al registrar el usuario.'));
        exit;
    }
} else {
    header('Location: ../frontend/paginas/register/register.html');
    exit;
}