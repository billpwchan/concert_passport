/** Public official collection is the default. Paid event APIs require explicit opt-in. */
export function dataMode(): 'official' | 'hybrid' {
  return process.env.CONCERT_PASSPORT_DATA_MODE === 'hybrid' ? 'hybrid' : 'official';
}

export function paidEventApisEnabled(): boolean {
  return dataMode() === 'hybrid';
}
