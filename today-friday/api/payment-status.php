<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

use TodayFriday\Payment\PaymentService;

$id = trim((string)($_GET['payment_id'] ?? ''));
if ($id === '') {
    json_response(['error' => 'payment_id is required'], 400);
}

try {
    json_response((new PaymentService())->getStatus($id));
} catch (RuntimeException $e) {
    json_response(['error' => 'Payment not found'], 404);
} catch (Throwable $e) {
    json_response(['error' => 'Unable to get payment status'], 500);
}
