/** Lets the user pick an export file; resolves to its text, or null if cancelled. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? file.text() : null);
    };
    // Fires when the dialog is closed without a selection (modern browsers).
    input.oncancel = () => resolve(null);
    input.click();
  });
}
