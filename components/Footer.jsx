import Link from 'next/link';
import Icon from './Icon';
import { MAIL, PHONE, ADDRESS } from '@/lib/site';

const COMPANY = [
  ['/', 'Home'],
  ['/about/', 'About us'],
  ['/services/', 'Services'],
  ['/tax-calculators/', 'Tax Calculators'],
  ['/financial-calculators/', 'Financial Calculators'],
  ['/cfo-desk/', 'CFO Desk'],
  ['/applications/', 'Applications'],
  ['/resources/', 'Resources'],
  ['/blog/', 'Blog'],
  ['/careers/', 'Careers'],
  ['/contact/', 'Contact'],
];
const GLOBAL = [
  ['/services/', 'Pakistan'],
  ['/services/international/uae/', 'United Arab Emirates'],
  ['/services/international/ksa/', 'Saudi Arabia'],
  ['/services/international/bh/', 'Bahrain'],
  ['/services/international/uk/', 'United Kingdom'],
  ['/services/international/us/', 'United States'],
];

export default function Footer() {
  return (
    <footer>
      <div className="w">
        <div className="fgrid">
          <div className="fbrand">
            <div className="chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="logo-img" src="/logo.png" alt="BIZEASE SOLUTIONS logo" />
            </div>
            <div className="wm">BIZEASE SOLUTIONS</div>
            <p>All business needs under one roof. Accounting, taxation, audit, company formation and advisory for Pakistan and the world&apos;s business hubs.</p>
            <div className="fsoc">
              <a href="https://www.facebook.com/bizeasesolutionspk" target="_blank" rel="noopener" aria-label="Facebook">
                <Icon n="facebook" s={18} />
              </a>
              <a href="https://www.youtube.com/@BIZEASESOLUTIONS" target="_blank" rel="noopener" aria-label="YouTube">
                <Icon n="youtube" s={18} />
              </a>
              <a href="https://wa.me/923084535456" target="_blank" rel="noopener" aria-label="WhatsApp">
                <Icon n="msg" s={18} />
              </a>
            </div>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              {COMPANY.map(([h, l]) => (
                <li key={h}>
                  <Link href={h}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Global presence</h4>
            <ul>
              {GLOBAL.map(([h, l]) => (
                <li key={h}>
                  <Link href={h}>{l}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Contact us</h4>
            <div className="fci">
              <Icon n="phone" s={18} />
              <span>
                <a href="tel:+923084535456">{PHONE}</a>
              </span>
            </div>
            <div className="fci">
              <Icon n="mail" s={18} />
              <span>
                <a href={'mailto:' + MAIL}>{MAIL}</a>
              </span>
            </div>
            <div className="fci">
              <Icon n="pin" s={18} />
              <span>{ADDRESS}</span>
            </div>
            <div className="fci">
              <Icon n="clock" s={18} />
              <span>Mon – Sat, 10am – 6pm PKT</span>
            </div>
          </div>
        </div>
        <div className="fbot">
          <span>© 2026 BIZEASE SOLUTIONS. All rights reserved.</span>
          <span className="links">
            <Link href="/contact/">Privacy Policy</Link>
            <Link href="/contact/">Terms of Service</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
