<?php
declare(strict_types=1);

namespace TodayFriday\Payment;

use TodayFriday\Database;
use TodayFriday\Env;

final class PaymentService
{
    private Database $database;

    public function __construct(?Database $database = null)
    {
        $this->database = $database ?? new Database();
    }

    public function createPayment(): array
    {
        $paymentId = bin2hex(random_bytes(16));
        $amount = (float) Env::get('PAYMENT_AMOUNT', '99.00');
        $currency = Env::get('PAYMENT_CURRENCY', 'RUB') ?? 'RUB';
        $provider = Env::get('PAYMENT_PROVIDER', 'stub') ?? 'stub';

        // Stub can auto-pay only in non-production environments.
        $autoPay = $provider === 'stub'
            && Env::bool('STUB_AUTO_PAY', false)
            && Env::get('APP_ENV', 'local') !== 'production';

        $status = $autoPay ? 'paid' : 'pending';

        $pdo = $this->database->connection();
        $stmt = $pdo->prepare(
            'INSERT INTO payments (payment_id, provider, status, amount, currency, paid_at)
             VALUES (:payment_id, :provider, :status, :amount, :currency, :paid_at)'
        );
        $stmt->execute([
            'payment_id' => $paymentId,
            'provider' => $provider,
            'status' => $status,
            'amount' => $amount,
            'currency' => $currency,
            'paid_at' => $status === 'paid' ? date('Y-m-d H:i:s') : null,
        ]);

        return [
            'payment_id' => $paymentId,
            'status' => $status,
            'amount' => $amount,
            'currency' => $currency,
            'payment_url' => null,
        ];
    }

    public function getStatus(string $paymentId): array
    {
        $stmt = $this->database->connection()->prepare(
            'SELECT payment_id, status, amount, currency, payment_url
             FROM payments WHERE payment_id = :payment_id LIMIT 1'
        );
        $stmt->execute(['payment_id' => $paymentId]);
        $row = $stmt->fetch();

        if (!$row) {
            throw new \RuntimeException('Payment not found');
        }

        return $row;
    }

    public function markPaid(string $paymentId): void
    {
        $stmt = $this->database->connection()->prepare(
            "UPDATE payments SET status='paid', paid_at=NOW() WHERE payment_id=:payment_id"
        );
        $stmt->execute(['payment_id' => $paymentId]);
    }
}
