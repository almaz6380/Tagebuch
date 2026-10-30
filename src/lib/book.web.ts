/** Opens the book in a new tab and starts the browser's print dialog ("Save as PDF"). */
export async function shareBook(html: string, _title: string) {
  const win = window.open('', '_blank');
  if (!win) throw new Error('popup blocked');
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
  setTimeout(() => win.print(), 800);
}
