export interface ClinicDateTime {
  date: string;
  time: string;
}

export function getClinicDateTime(): ClinicDateTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}

export function getClinicDate(): string {
  return getClinicDateTime().date;
}

export function formatDateOnly(dateValue: string): string {
  const [year, month, day] = dateValue.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) {
    return dateValue;
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
    .format(new Date(year, month - 1, day));
}

export function formatTimeOnly(timeValue: string): string {
  return timeValue.slice(0, 5);
}
