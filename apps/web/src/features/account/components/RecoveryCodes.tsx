import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';

/** One-time recovery codes: shown once, with copy and download. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = `CommunityCare recovery codes (each works once)\n\n${codes.join('\n')}\n`;

  const copy = async () => {
    await navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopied(true);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'communitycare-recovery-codes.txt' });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-2 rounded-card border border-zinc-200 bg-zinc-50 p-4 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
        {codes.map((code) => <li key={code} className="text-zinc-900 dark:text-zinc-100">{code}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void copy()}><Icon name={copied ? 'check' : 'list'} /> {copied ? 'Copied' : 'Copy'}</Button>
        <Button onClick={download}><Icon name="upload" className="h-4 w-4 rotate-180" /> Download</Button>
      </div>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">Keep these somewhere safe, like a password manager. Each one signs you in once if you lose your phone. They won't be shown again.</p>
    </div>
  );
}
