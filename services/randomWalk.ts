import { ScenarioConfig } from '../types';

/**
 * Calculates the next step using a Mean-Reverting Random Walk (Ornstein-Uhlenbeck style).
 * 
 * Instead of just moving randomly (which can get stuck at boundaries),
 * this algorithm includes a "drift" term that gently pulls the value 
 * towards the center of the min/max range.
 * 
 * @param current The current value.
 * @param min The minimum allowed value.
 * @param max The maximum allowed value.
 * @param volatility The magnitude of the random noise.
 * @param precision Decimal places to round to.
 */
export const getNextValue = (
  current: number,
  min: number,
  max: number,
  volatility: number,
  precision: number = 1
): number => {
  // 1. Initialization
  let base = current;
  if (current < min) base = min;
  if (current > max) base = max;

  // 2. Mean Reversion Logic
  // Calculate the "Center" of the user's desired range
  const center = (min + max) / 2;
  
  // Calculate "Drift": How far are we from the center?
  // We apply a 20% pull towards the center.
  // If we are at Min, drift is positive (up). If at Max, drift is negative (down).
  const reversionStrength = 0.2; 
  const drift = (center - base) * reversionStrength;

  // 3. Random Noise
  // We still add random volatility so it's not predictable
  const noise = (Math.random() * 2 - 1) * volatility;

  // 4. Calculate Next Step
  let next = base + drift + noise;

  // 5. Hard Clamp
  // Ensure we never physically exceed the machine limits
  next = Math.max(min, Math.min(max, next));
  
  // 6. Rounding
  const factor = Math.pow(10, precision);
  return Math.round(next * factor) / factor;
};

/**
 * Generates the next target state based on the random walk configuration.
 */
export const generateNextScenarioState = (
  currentSpeed: number,
  currentIncline: number,
  config: ScenarioConfig
) => {
  return {
    speed: getNextValue(
      currentSpeed,
      config.speed.min,
      config.speed.max,
      config.speed.volatility,
      1 
    ),
    incline: getNextValue(
      currentIncline,
      config.incline.min,
      config.incline.max,
      config.incline.volatility,
      1 
    )
  };
};