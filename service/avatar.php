<?php
/** Fotos de perfil: validación, recorte y recodificación. */
class Avatar {
    public const MAX_BYTES = 5 * 1024 * 1024;
    public const LADO = 400;          // px

    public static function carpeta(): string {
        return dirname(__DIR__) . '/uploads/avatars';
    }

    /** Procesa $_FILES['avatar'] y devuelve el nombre del archivo guardado. */
    public static function guardar(?array $f): string {
        if (!is_array($f) || is_array($f['error'] ?? null)) throw new ApiException('No se recibió ninguna imagen.');
        if (in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
            throw new ApiException('La imagen supera el tamaño máximo que acepta el servidor (revisá upload_max_filesize en php.ini).');
        }
        if ($f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) throw new ApiException('No se pudo recibir la imagen.');
        if ($f['size'] > self::MAX_BYTES) throw new ApiException('La imagen supera los 5 MB permitidos.');

        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
        if (!in_array($mime, ['image/jpeg', 'image/png'], true)) throw new ApiException('Solo se aceptan imágenes JPG o PNG.');
        $info = @getimagesize($f['tmp_name']);
        if (!$info || $info[0] < 1 || $info[1] < 1) throw new ApiException('El archivo no es una imagen válida.');
        if ($info[0] * $info[1] > 40000000) throw new ApiException('La imagen tiene demasiados píxeles.');
        if (!function_exists('imagecreatetruecolor')) {
            error_log('[competika] falta la extensión GD de PHP para procesar avatares');
            throw new ApiException('El servidor no puede procesar imágenes (falta la extensión GD de PHP).', 500);
        }

        $png = $mime === 'image/png';
        $src = $png ? @imagecreatefrompng($f['tmp_name']) : @imagecreatefromjpeg($f['tmp_name']);
        if (!$src) throw new ApiException('El archivo no es una imagen válida.');

        if (!$png && function_exists('exif_read_data')) {          // orientación de fotos de celular
            $exif = @exif_read_data($f['tmp_name']);
            $rot = [3 => 180, 6 => -90, 8 => 90][(int)($exif['Orientation'] ?? 1)] ?? 0;
            if ($rot !== 0 && ($r = imagerotate($src, $rot, 0))) { imagedestroy($src); $src = $r; }
        }

        $w = imagesx($src); $h = imagesy($src);
        $lado = min($w, $h);
        $tam = min(self::LADO, $lado);
        $dst = imagecreatetruecolor($tam, $tam);
        if ($png) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
        }
        imagecopyresampled($dst, $src, 0, 0, intdiv($w - $lado, 2), intdiv($h - $lado, 2), $tam, $tam, $lado, $lado);
        imagedestroy($src);

        $dir = self::carpeta();
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
        if (!is_dir($dir) || !is_writable($dir)) {
            imagedestroy($dst);
            error_log("[competika] sin permiso de escritura en $dir");
            $prod = env('APP_ENV', 'development') === 'production';
            throw new ApiException($prod ? 'No se pudo guardar la imagen en el servidor.'
                : 'No se pudo guardar la imagen: la carpeta uploads/avatars no existe o Apache no puede escribir en ella.', 500);
        }

        $archivo = bin2hex(random_bytes(16)) . ($png ? '.png' : '.jpg');
        $ok = $png ? imagepng($dst, "$dir/$archivo", 6) : imagejpeg($dst, "$dir/$archivo", 85);
        imagedestroy($dst);
        if (!$ok) throw new ApiException('No se pudo guardar la imagen en el servidor.', 500);
        return $archivo;
    }

    /** Borra un archivo de avatar (solo nombres generados por el servidor). */
    public static function borrar(?string $archivo): void {
        if (Formato::fotoUrl($archivo) !== null) {
            $path = self::carpeta() . '/' . $archivo;
            if (is_file($path)) @unlink($path);
        }
    }
}
