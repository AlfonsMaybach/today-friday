<?php
return [
    'app_env' => getenv('APP_ENV') ?: 'local',
    'app_url' => getenv('APP_URL') ?: 'http://localhost:8080',
    'timezone' => getenv('APP_TIMEZONE') ?: 'Europe/Moscow',
    'payment_provider' => getenv('PAYMENT_PROVIDER') ?: 'stub',
];
