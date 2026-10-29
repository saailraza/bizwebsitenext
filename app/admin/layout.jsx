import './admin.css';

export const metadata = {
  title: 'Admin | BIZEASE SOLUTIONS',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }) {
  return <div className="adm">{children}</div>;
}
