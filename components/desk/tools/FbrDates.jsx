'use client';
import ComplianceCalendar from './ComplianceCalendar';

export default function FbrDates({ rates }) {
  return <ComplianceCalendar mode="fbr" rates={rates} />;
}
