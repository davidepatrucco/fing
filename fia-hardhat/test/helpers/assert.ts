// Tiny helper to wrap BigInt for Chai assertions without TS type errors
export function big(value: bigint | string | number): any {
  if (typeof value === 'string') return BigInt(value) as any;
  if (typeof value === 'number') return BigInt(value) as any;
  return value as any;
}

export default big;
