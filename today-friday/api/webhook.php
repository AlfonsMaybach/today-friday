<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

use TodayFriday\Env;
use TodayFriday\Payment\PaymentService;

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['error' => 'Method not allowed'], 405);
}

/*
 * Production integration point.
 * Do NOT trust payment_id/status from the request until the real provider's
 * signature has been verified according to its current API documentation.
 */
$secret = Env::get('PAYMENT_WEBHOOK_SECRET', '');
if (Env::get('APP_ENV', 'local') === 'production' && $secret === '') {
    json_response(['error' => 'Webhook is not configured'], 503);
}

$payload = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($payload)) {
    json_response(['error' => 'Invalid JSON'], 400);
}

if (Env::get('PAYMENT_PROVIDER', 'stub') !== 'stub') {
    json_response(['error' => 'Provider signature verification is not implemented'], 501);
}

$id = trim((string)($payload['payment_id'] ?? ''));
$status = trim((string)($payload['status'] ?? ''));

if ($id === '' || $status !== 'paid') {
    json_response(['ok' => true]);
}

try {
    (new PaymentService())->markPaid($id);
    json_response(['ok' => true]);
} catch (Throwable $e) {
    json_response(['error' => 'Webhook processing failed'], 500);
}
