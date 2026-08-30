"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTH_LABELS, WEEKDAY_LABELS } from "../_lib/time";

export interface ViewedMonth {
  year: number;
  month: number; // 1-indexado
}

interface Cell {
  key: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean;
}

function buildCells(viewedMonth: ViewedMonth): Cell[] {
  const { year, month } = viewedMonth;
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = firstOfMonth.getUTCDay(); // 0 = domingo
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: Cell[] = [];
  for (let i = startOffset; i > 0; i--) {
    const d = new Date(Date.UTC(year, month - 1, 1 - i));
    cells.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
      day: d.getUTCDate(),
      inMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      day,
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const [ly, lm, ld] = last.key.split("-").map(Number);
    const d = new Date(Date.UTC(ly, lm - 1, ld + 1));
    cells.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
      day: d.getUTCDate(),
      inMonth: false,
    });
  }
  return cells;
}

interface BookingCalendarProps {
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  availableDates: Set<string>;
  loading: boolean;
  todayKey: string;
  viewedMonth: ViewedMonth;
  onViewedMonthChange: (m: ViewedMonth) => void;
}

export default function BookingCalendar({
  selectedDate,
  onSelectDate,
  availableDates,
  loading,
  todayKey,
  viewedMonth,
  onViewedMonthChange,
}: BookingCalendarProps) {
  const cellRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [pendingFocusKey, setPendingFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (pendingFocusKey) {
      cellRefs.current[pendingFocusKey]?.focus();
      setPendingFocusKey(null);
    }
  }, [pendingFocusKey, viewedMonth]);

  const { year, month } = viewedMonth;
  const cells = buildCells(viewedMonth);

  const isPast = (key: string) => key < todayKey;
  const isAvailable = (key: string) => availableDates.has(key);
  const isSelectable = (cell: Cell) => cell.inMonth && !isPast(cell.key) && isAvailable(cell.key);

  const canGoPrev =
    year > Number(todayKey.slice(0, 4)) ||
    (year === Number(todayKey.slice(0, 4)) && month > Number(todayKey.slice(5, 7)));

  function changeMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    onViewedMonthChange({ year: newYear, month: newMonth });
  }

  // Roving tabindex: siempre hay exactamente un día "en el flujo de tab" --
  // el seleccionado si está en este mes, si no el primer día elegible.
  const rovingKey =
    (selectedDate && cells.some((c) => c.key === selectedDate) ? selectedDate : null) ??
    cells.find((c) => isSelectable(c))?.key ??
    cells.find((c) => c.inMonth)?.key ??
    null;

  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, cell: Cell) {
    const deltaMap: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    const [cy, cm, cd] = cell.key.split("-").map(Number);
    let delta: number | undefined = deltaMap[e.key];

    if (e.key === "Home") delta = -new Date(Date.UTC(cy, cm - 1, cd)).getUTCDay();
    if (e.key === "End") delta = 6 - new Date(Date.UTC(cy, cm - 1, cd)).getUTCDay();

    if (delta === undefined) return;
    e.preventDefault();

    const target = new Date(Date.UTC(cy, cm - 1, cd + delta));
    const targetKey = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(target.getUTCDate()).padStart(2, "0")}`;
    const targetMonth = { year: target.getUTCFullYear(), month: target.getUTCMonth() + 1 };

    if (targetMonth.year !== year || targetMonth.month !== month) {
      setPendingFocusKey(targetKey);
      onViewedMonthChange(targetMonth);
    } else {
      cellRefs.current[targetKey]?.focus();
    }
  }

  const monthLabel = `${MONTH_LABELS[month - 1]} ${year}`;

  return (
    <div className="cw-pb-calendar">
      <div className="cw-pb-calendar-header">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          disabled={!canGoPrev}
          aria-label="Mes anterior"
          className="cw-pb-calendar-nav"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <span className="cw-pb-calendar-month" aria-live="polite">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Mes siguiente"
          className="cw-pb-calendar-nav"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="cw-pb-calendar-dow" aria-hidden="true">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div className="cw-pb-calendar-grid">
        {cells.map((cell) => {
          if (!cell.inMonth) {
            return <span key={cell.key} className="cw-pb-calendar-day outside" aria-hidden="true" />;
          }

          const selectable = isSelectable(cell);
          const selected = cell.key === selectedDate;
          const isToday = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              type="button"
              ref={(el) => {
                cellRefs.current[cell.key] = el;
              }}
              aria-disabled={!selectable}
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${cell.day} de ${MONTH_LABELS[month - 1]}${!selectable ? ", sin disponibilidad" : ""}`}
              tabIndex={cell.key === rovingKey ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, cell)}
              onClick={() => selectable && onSelectDate(cell.key)}
              className={`cw-pb-calendar-day ${selected ? "selected" : ""} ${isToday ? "today" : ""} ${!selectable ? "unavailable" : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <p className="cw-pb-calendar-hint" role="status">
        {loading
          ? "Actualizando disponibilidad…"
          : !cells.some((c) => c.inMonth && isSelectable(c))
            ? "Sin fechas disponibles este mes. Prueba con el siguiente."
            : null}
      </p>
    </div>
  );
}
