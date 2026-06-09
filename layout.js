import './globals.css'

export const metadata = {
  title: 'Verificador de Documentación — Argenpymes Riesgos',
  description: 'Verificá la documentación antes de enviar al área de riesgos',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
