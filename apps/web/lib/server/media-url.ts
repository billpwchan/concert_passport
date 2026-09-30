export function isSafeStoredMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLocaleLowerCase('en-US');
    return url.protocol === 'https:' && !url.username && !url.password
      && (!url.port || url.port === '443')
      && host !== 'localhost' && !host.endsWith('.local')
      && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)
      && host !== '[::1]';
  } catch {
    return false;
  }
}
