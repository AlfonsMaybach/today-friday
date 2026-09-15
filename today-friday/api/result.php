<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';

use TodayFriday\Database;
use TodayFriday\FridayChecker;
use TodayFriday\Payment\PaymentService;

$id = trim((string)($_GET['payment_id'] ?? ''));
if ($id === '') {
    json_response(['error' => 'payment_id is required'], 400);
}

try {
    $payment = (new PaymentService())->getStatus($id);
    if (($payment['status'] ?? '') !== 'paid') {
        json_response(['error' => 'Payment required'], 402);
    }

    $checker = new FridayChecker();
    $isFriday = $checker->isFriday();

    $pdo = (new Database())->connection();
    $stmt = $pdo->prepare(
        'INSERT INTO checks (payment_id, is_friday)
         VALUES (:payment_id, :is_friday)
         ON DUPLICATE KEY UPDATE is_friday = VALUES(is_friday)'
    );
    $stmt->execute([
        'payment_id' => $id,
        'is_friday' => $isFriday ? 1 : 0,
    ]);

    json_response([
        'is_friday' => $isFriday,
        'answer' => $isFriday ? 'ДА!' : 'НЕТ',
    ]);
} catch (RuntimeException $e) {
    json_response(['error' => 'Payment not found'], 404);
} catch (Throwable $e) {
    json_response(['error' => 'Unable to reveal result'], 500);
}
