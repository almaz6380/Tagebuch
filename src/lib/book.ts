import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Renders the book HTML to a PDF and opens the share sheet (print, save to Files, send). */
export async function shareBook(html: string, title: string) {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: title });
}
