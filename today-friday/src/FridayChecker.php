<?php
declare(strict_types=1);

namespace TodayFriday;

final class FridayChecker
{
    public function isFriday(?\DateTimeImmutable $now = null): bool
    {
        $now = $now ?? new \DateTimeImmutable('now');
        return $now->format('N') === '5';
    }
}
