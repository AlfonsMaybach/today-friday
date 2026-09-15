import './globals.css';

export const metadata = {
  title: 'Сегодня пятница?',
  description: '99 ₽ за правду. Узнайте, сегодня пятница или нет.',
  icons: { icon: '/favicon.svg' }
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
