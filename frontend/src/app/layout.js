import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata = {
  title: 'WaitLess - Smart Hospital Queue',
  description: 'Skip the wait with virtual queue management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
