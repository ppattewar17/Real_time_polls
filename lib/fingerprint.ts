export async function generateFingerprint(): Promise<string> {
  const components: string[] = [];

  components.push(navigator.userAgent);

  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);

  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  components.push(navigator.language);

  components.push(navigator.platform);

  components.push(String(navigator.hardwareConcurrency || 0));

  if ('deviceMemory' in navigator) {
    components.push(String((navigator as any).deviceMemory));
  }

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = 200;
      canvas.height = 50;
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Hello, world!', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Hello, world!', 4, 17);
      const canvasData = canvas.toDataURL();
      components.push(canvasData);
    }
  } catch (e) {
    components.push('canvas-unavailable');
  }

  const fingerprint = await hashString(components.join('|'));
  return fingerprint;
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

export function storeFingerprint(fingerprint: string): void {
  try {
    localStorage.setItem('poll_fingerprint', fingerprint);
  } catch (e) {
    console.warn('Could not store fingerprint in localStorage:', e);
  }
}

export function getStoredFingerprint(): string | null {
  try {
    return localStorage.getItem('poll_fingerprint');
  } catch (e) {
    console.warn('Could not retrieve fingerprint from localStorage:', e);
    return null;
  }
}

export async function getOrGenerateFingerprint(): Promise<string> {
  const stored = getStoredFingerprint();
  if (stored) {
    return stored;
  }

  const fingerprint = await generateFingerprint();
  storeFingerprint(fingerprint);
  return fingerprint;
}