// lib/rate-limiter.ts

export class EthicalRateLimiter {
    private bucket: {
        capacity: number;
        tokens: number;
        refillRate: number; // tokens per second
        lastRefill: number;
    };

    constructor(capacity = 4000, refillRatePerHour = 4000) {
        this.bucket = {
            capacity,
            tokens: capacity,
            refillRate: refillRatePerHour / 3600,
            lastRefill: Date.now(),
        };
    }

    async acquire(cost = 1): Promise<boolean> {
        this.refill();

        if (this.bucket.tokens >= cost) {
            this.bucket.tokens -= cost;
            return true;
        }
        return false;
    }

    private refill() {
        const now = Date.now();
        const elapsedSeconds = (now - this.bucket.lastRefill) / 1000;
        const tokensToAdd = elapsedSeconds * this.bucket.refillRate;

        this.bucket.tokens = Math.min(this.bucket.capacity, this.bucket.tokens + tokensToAdd);
        this.bucket.lastRefill = now;
    }

    getStatus() {
        this.refill();
        return {
            tokens: Math.floor(this.bucket.tokens),
            capacity: this.bucket.capacity,
            percentage: (this.bucket.tokens / this.bucket.capacity) * 100,
        };
    }
}

// Global instance for the prototype
export const globalRateLimiter = new EthicalRateLimiter();
