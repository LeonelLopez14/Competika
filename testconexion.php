<?php
require_once __DIR__ . '/config/Database.php';

try {
    $pdo = Database::getInstance();
    echo "✅ Conexión exitosa a la base de datos.";
} catch (PDOException $e) {
    echo "❌ Error de conexión: " . $e->getMessage();
}