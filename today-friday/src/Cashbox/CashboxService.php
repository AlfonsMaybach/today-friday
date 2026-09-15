<?php
declare(strict_types=1);

namespace TodayFriday\Cashbox;

final class CashboxService
{
    public function createReceipt(string $paymentId, float $amount): array
    {
        // Integration point for Digital Kassa.
        return [
            'payment_id' => $paymentId,
            'amount' => $amount,
            'status' => 'not_configured',
        ];
    }
}
