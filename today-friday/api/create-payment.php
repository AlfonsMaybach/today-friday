<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

use TodayFriday\Payment\PaymentService;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

try {
    json_response((new PaymentService())->createPayment(), 201);
} catch (Throwable $e) {
    json_response(['error' => 'Unable to create payment'], 500);
}
