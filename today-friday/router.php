<?php
declare(strict_types=1);

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';

if (strpos($uri, '/api/') === 0) {
    $file = __DIR__ . $uri . '.php';
    if (is_file($file)) {
        require $file;
        return true;
    }
}

$publicFile = __DIR__ . '/public' . ($uri === '/' ? '/index.php' : $uri);
if (is_file($publicFile)) {
    if (pathinfo($publicFile, PATHINFO_EXTENSION) === 'php') {
        require $publicFile;
    } else {
        return false;
    }
    return true;
}

http_response_code(404);
echo 'Not Found';
return true;
