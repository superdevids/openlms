import { SetMetadata } from "@nestjs/common";

/** Kunci metadata feature flag sebuah handler (F1-T13, prd04 §5.N). */
export const FEATURE_KEY = "opensis:feature";

/**
 * @Feature("LMS_BASE") — endpoint hanya bisa diakses bila flag aktif.
 * Flag OFF → FeatureFlagGuard mengembalikan 403 FEATURE_DISABLED.
 */
export const Feature = (key: string): MethodDecorator => SetMetadata(FEATURE_KEY, key);
