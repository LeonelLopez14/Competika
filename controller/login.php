<?php
session_start();
require_once __DIR__ . '/../repository/usuario_repository.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($email) || empty($password)) {
        header('Location: ../frontend/paginas/login/login.html?error=' . urlencode('Completá email y contraseña.'));
        exit;
    }

    $repo = new UsuarioRepository();
    $usuarioData = $repo->obtenerPorEmail($email);

    if (!$usuarioData) {
        header('Location: ../frontend/paginas/login/login.html?error=' . urlencode('Email o contraseña incorrectos.'));
        exit;
    }

    if (!password_verify($password, $usuarioData['contrasenia'])) {
        header('Location: ../frontend/paginas/login/login.html?error=' . urlencode('Email o contraseña incorrectos.'));
        exit;
    }

    // Login correcto: guardamos datos básicos en sesión
    $_SESSION['usuario_ci'] = $usuarioData['ci'];
    $_SESSION['usuario_nombre'] = $usuarioData['nombre'];
    $_SESSION['usuario_rol'] = $usuarioData['rol_usuario'];

    header('Location: ../frontend/index.html');
    exit;
} else {
    header('Location: ../frontend/paginas/login/login.html');
    exit;
}