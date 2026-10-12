# Imagen de la aplicación: Apache + PHP 8.3 con el código de Competika
FROM php:8.3-apache

# pdo_mysql: base de datos · gd: procesar fotos de perfil · exif: orientación de fotos de celular
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpng-dev libjpeg62-turbo-dev \
 && docker-php-ext-configure gd --with-jpeg \
 && docker-php-ext-install pdo_mysql gd exif \
 && rm -rf /var/lib/apt/lists/* \
 && a2enmod rewrite headers \
 && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && printf 'upload_max_filesize = 5M\npost_max_size = 8M\n' > "$PHP_INI_DIR/conf.d/competika.ini" \
 && sed -i 's/^ServerTokens .*/ServerTokens Prod/; s/^ServerSignature .*/ServerSignature Off/' /etc/apache2/conf-available/security.conf

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY --chown=www-data:www-data . /var/www/html/
RUN mkdir -p /var/www/html/uploads/avatars && chown -R www-data:www-data /var/www/html/uploads

EXPOSE 80
