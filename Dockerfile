# Imagen de la aplicación: Apache + PHP 8.3 con el código de Competika
FROM php:8.3-apache

RUN docker-php-ext-install pdo_mysql \
 && a2enmod rewrite headers \
 && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
 && sed -i 's/^ServerTokens .*/ServerTokens Prod/; s/^ServerSignature .*/ServerSignature Off/' /etc/apache2/conf-available/security.conf

COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY --chown=www-data:www-data . /var/www/html/

EXPOSE 80
