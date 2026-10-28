import React, { useState } from 'react';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL' },
  { value: 'html', label: 'HTML/CSS' },
  { value: 'other', label: 'Other' },
];

export const CODE_DOMAINS = [
  'Web Development',
  'Artificial Intelligence',
  'Data Science',
  'Data analytics',
  'Cybersecurity',
];

export default function CodeEditor({ onSubmit, disabled }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (!code.trim()) return;
    const formatted = `\`\`\`${language}\n${code.trim()}\n\`\`\``;
    onSubmit(formatted);
    setCode('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="text-xs text-accent hover:text-accent-start transition-colors disabled:opacity-50 bg-surface-2 border border-border-subtle rounded-full px-3 py-1"
      >
        + Write Code
      </button>
    );
  }

  return (
    <div className="bg-surface-base border border-border-subtle rounded-xl overflow-hidden mb-2 animate-fade-in">
      <div className="flex items-center justify-between px-3 py-2 bg-surface-1 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-surface-2 text-text-primary text-xs border border-border-subtle rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!code.trim() || disabled}
            className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors disabled:opacity-50"
          >
            Send Code
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); setCode(''); }}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Write your code here..."
          spellCheck={false}
          className="w-full h-40 bg-surface-base text-green-300 font-mono text-sm p-3 resize-y focus:outline-none placeholder:text-text-muted"
          style={{ tabSize: 2 }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const start = e.target.selectionStart;
              const end = e.target.selectionEnd;
              setCode(code.substring(0, start) + '  ' + code.substring(end));
              setTimeout(() => {
                e.target.selectionStart = e.target.selectionEnd = start + 2;
              }, 0);
            }
          }}
        />
        <div className="absolute bottom-2 right-3 text-xs text-text-muted">
          {code.split('\n').length} lines
        </div>
      </div>
    </div>
  );
}
