import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  History,
  LogOut,
  Plus,
  Users,
  X,
} from "lucide-react";
import { supabase } from "./main";

const COLORS = ["#e76f51", "#2a9d8f", "#457b9d", "#9b5de5", "#e9a23b"];
const CATEGORIES = {
  children: { label: "Дети", color: "#6aaed6" },
  parents: { label: "Родители", color: "#5f9f7b" },
  school: { label: "Школа и занятия", color: "#9a83c7" },
  health: { label: "Здоровье", color: "#ed8b72" },
  grandparents: { label: "Бабушка и дедушка", color: "#3f7fc4" },
  family: { label: "Общее семейное", color: "#c59b67" },
};
const CARE_OPTIONS = {
  none: { label: "Не указано", short: "—", color: "#8b9197" },
  mother: {
    label: "С мамой",
    short: "МАМА",
    color: "#B9788F",
    background: "#F3E7EB",
  },
  father: { label: "С папой", short: "ПАПА", color: "#5B95BF" },
  both: {
    label: "С родителями",
    short: "РОД",
    color: "#8067A9",
    background: "#EEE8F4",
  },
  grandparents: {
    label: "С бабушкой и дедушкой",
    short: "БД",
    color: "#B79563",
    background: "#F4EBDD",
  },
  independent: {
    label: "Самостоятельно",
    short: "САМ",
    color: "#6F9A7D",
    background: "#E4EFE7",
  },
  other: {
    label: "Другое",
    short: "ДР",
    color: "#8B8F97",
    background: "#ECEDEF",
  },
};
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const pad = (n) => String(n).padStart(2, "0");
const localDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dateTime = (date, time) => new Date(`${date}T${time}:00`).toISOString();
const endDateTime = (date, start, end, nextDay = end <= start) => {
  const value = new Date(`${date}T${end}:00`);
  if (nextDay) value.setDate(value.getDate() + 1);
  return value.toISOString();
};
const allDayEnd = (date) => {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + 1);
  return value.toISOString();
};
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtLogDate = (iso) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
function recurringDates(start, until, rule) {
  if (rule === "none") return [start];
  const result = [],
    first = new Date(`${start}T12:00:00`),
    limit = new Date(`${until}T12:00:00`),
    originalDay = first.getDate();
  for (let n = 0; n < 1000 && result.length < 120; n++) {
    let current;
    if (rule === "monthly") {
      const year = first.getFullYear(),
        month = first.getMonth() + n;
      const lastDay = new Date(year, month + 1, 0).getDate();
      current = new Date(year, month, Math.min(originalDay, lastDay), 12);
    } else {
      current = new Date(first);
      current.setDate(first.getDate() + n);
    }
    if (current > limit) break;
    const weekday = current.getDay();
    const include =
      rule === "daily" ||
      rule === "monthly" ||
      (rule === "weekly" && n % 7 === 0) ||
      (rule === "weekdays" && weekday >= 1 && weekday <= 5);
    if (include) result.push(localDate(current));
  }
  return result;
}

function daysForMonth(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
function daysForWeek(cursor) {
  const start = new Date(cursor);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!supabase) return <Setup />;
  if (loading) return <Splash />;
  if (!session) return <Login />;
  return <CalendarApp session={session} />;
}

function Setup() {
  return (
    <main className="center">
      <div className="card auth-card">
        <div className="brand-mark">С</div>
        <h1>Почти готово</h1>
        <p>
          Скопируйте <code>.env.example</code> в <code>.env</code> и укажите URL
          и publishable key вашего проекта Supabase.
        </p>
      </div>
    </main>
  );
}
function Splash() {
  return (
    <main className="center">
      <div className="loader" />
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Неверная почта или пароль");
    setBusy(false);
  }
  return (
    <main className="center auth-bg">
      <div className="card auth-card">
        <div className="brand-mark">С</div>
        <p className="eyebrow">ВСЁ В ОДНОМ МЕСТЕ</p>
        <h1>Семейный календарь</h1>
        <p>
          Планы, которые видит вся семья. Войдите со своей почтой и паролем.
        </p>
        <form onSubmit={submit}>
          <label>Email</label>
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
          <label>Пароль</label>
          <div className="password-field">
            <input
              required
              minLength="6"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Не менее 6 символов"
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          <button className="primary wide" disabled={busy}>
            {busy ? "Входим…" : "Войти"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </main>
  );
}

function CalendarApp({ session }) {
  const [family, setFamily] = useState(null),
    [profile, setProfile] = useState(null),
    [events, setEvents] = useState([]),
    [logs, setLogs] = useState([]);
  const [cursor, setCursor] = useState(new Date()),
    [selected, setSelected] = useState(localDate(new Date())),
    [viewMode, setViewMode] = useState("month"),
    [modal, setModal] = useState(null),
    [profileOpen, setProfileOpen] = useState(false),
    [history, setHistory] = useState(false),
    [busy, setBusy] = useState(true),
    [notice, setNotice] = useState("");
  async function loadBase() {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase
        .from("family_members")
        .select("family_id, role, families(*)")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle(),
    ]);
    setProfile(p);
    setFamily(m?.families ? { ...m.families, memberRole: m.role } : null);
    setBusy(false);
  }
  async function loadData(familyId = family?.id) {
    if (!familyId) return;
    const start = new Date(
        cursor.getFullYear(),
        cursor.getMonth() - 1,
        20,
      ).toISOString(),
      end = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 2,
        10,
      ).toISOString();
    const loadEvents = () =>
      supabase
        .from("events")
        .select("*, creator:profiles!events_created_by_fkey(display_name)")
        .eq("family_id", familyId)
        .lt("starts_at", end)
        .gt("ends_at", start)
        .order("starts_at");
    let eventResult;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      eventResult = await loadEvents();
      if (!eventResult.error) break;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
    const { data: a } = await supabase
      .from("audit_log")
      .select("*, actor:profiles!audit_log_actor_id_fkey(display_name)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: false })
      .limit(60);
    const { data: e, error } = eventResult;
    if (error) {
      setNotice("Не удалось загрузить календарь. Нажмите здесь, чтобы повторить.");
      return;
    }
    setNotice("");
    setEvents(e || []);
    setLogs(a || []);
  }
  useEffect(() => {
    loadBase();
  }, []);
  useEffect(() => {
    if (family) loadData();
  }, [family?.id, cursor]);
  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`family-${family.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `family_id=eq.${family.id}`,
        },
        () => loadData(family.id),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_log",
          filter: `family_id=eq.${family.id}`,
        },
        () => loadData(family.id),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [family?.id, cursor]);
  if (busy) return <Splash />;
  if (!family)
    return <Onboarding profile={profile} session={session} onDone={loadBase} />;
  const days =
      viewMode === "month"
        ? daysForMonth(cursor)
        : viewMode === "week"
          ? daysForWeek(cursor)
          : [new Date(cursor)],
    today = localDate(new Date());
  const weekEnd = days[days.length - 1];
  const periodTitle =
    viewMode === "month" ? (
      <>
        {MONTHS[cursor.getMonth()]} <span>{cursor.getFullYear()}</span>
      </>
    ) : viewMode === "week" ? (
      <>
        {days[0].toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
        })}{" "}
        —{" "}
        {weekEnd.toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "short",
        })}{" "}
        <span>{weekEnd.getFullYear()}</span>
      </>
    ) : (
      <>
        {days[0].toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}{" "}
        <span>{days[0].getFullYear()}</span>
      </>
    );
  const headerLabels =
    viewMode === "day"
      ? [days[0].toLocaleDateString("ru-RU", { weekday: "long" })]
      : WEEK;
  const byDay = events.reduce((a, e) => {
    const k = localDate(new Date(e.starts_at));
    (a[k] ||= []).push(e);
    return a;
  }, {});
  const selectedEvents = byDay[selected] || [];
  const selectedLabel = new Date(`${selected}T12:00:00`).toLocaleDateString(
    "ru-RU",
    { weekday: "long", day: "numeric", month: "long" },
  );
  async function saveEvent(data) {
    setNotice("");
    const payload = {
      family_id: family.id,
      title: data.title.trim(),
      description: data.description.trim() || null,
      starts_at: dateTime(data.date, data.allDay ? "00:00" : data.start),
      ends_at: data.allDay
        ? allDayEnd(data.date)
        : endDateTime(data.date, data.start, data.end, data.nextDay),
      all_day: data.allDay,
      category: data.category,
      care_by: data.careBy,
      color: CATEGORIES[data.category]?.color || data.color,
    };
    let q;
    if (data.id) q = supabase.from("events").update(payload).eq("id", data.id);
    else {
      const dates = recurringDates(
        data.date,
        data.repeatUntil || data.date,
        data.recurrence,
      );
      const rows = dates.map((date) => ({
        ...payload,
        starts_at: dateTime(date, data.allDay ? "00:00" : data.start),
        ends_at: data.allDay
          ? allDayEnd(date)
          : endDateTime(date, data.start, data.end, data.nextDay),
        created_by: session.user.id,
      }));
      q = supabase.from("events").insert(rows);
    }
    const { error } = await q;
    if (error) alert(`Не удалось сохранить событие: ${error.message}`);
    else {
      setNotice("");
      setModal(null);
      if (!data.id) {
        setSelected(data.date);
        setCursor(new Date(`${data.date}T12:00:00`));
      }
      await loadData();
    }
  }
  async function removeEvent(id) {
    if (!confirm("Удалить это событие? Запись останется в истории.")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) setNotice(error.message);
    else {
      setModal(null);
      loadData();
    }
  }
  function movePeriod(direction) {
    const next =
      viewMode === "month"
        ? new Date(cursor.getFullYear(), cursor.getMonth() + direction, 1)
        : new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate() + direction * (viewMode === "week" ? 7 : 1),
          );
    setCursor(next);
    if (viewMode === "week") {
      const nextSelected = new Date(`${selected}T12:00:00`);
      nextSelected.setDate(nextSelected.getDate() + direction * 7);
      setSelected(localDate(nextSelected));
    } else if (viewMode === "day") {
      setSelected(localDate(next));
    }
  }
  async function rotateInviteCode() {
    if (
      !confirm("Сменить код приглашения? Старый код сразу перестанет работать.")
    )
      return;
    const { data, error } = await supabase.rpc("rotate_family_invite_code", {
      target_family_id: family.id,
    });
    if (error) {
      alert(`Не удалось сменить код: ${error.message}`);
      return;
    }
    setFamily((current) => ({ ...current, invite_code: data }));
    await loadBase();
    alert(`Код приглашения изменён на ${data}`);
  }
  async function saveProfile(displayName, password) {
    const clean = displayName.trim();
    if (!clean) return;
    if (password) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });
      if (passwordError) {
        alert(`Не удалось установить пароль: ${passwordError.message}`);
        return;
      }
    }
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: clean })
      .eq("id", session.user.id);
    if (error) alert(`Не удалось сохранить профиль: ${error.message}`);
    else {
      setProfile((current) => ({ ...current, display_name: clean }));
      setProfileOpen(false);
      loadData();
      if (password) alert("Пароль установлен. Теперь можно входить без письма.");
    }
  }
  return (
    <div className="app-shell">
      <header>
        <div className="header-inner">
          <div className="brand">
            <div>
              <b>{family.name}</b>
              <small>семейный календарь</small>
            </div>
          </div>
          <div className="header-actions">
            <button className="ghost" onClick={() => setHistory(true)}>
              <History size={18} /> История
            </button>
            <button
              className="avatar"
              title="Изменить имя"
              onClick={() => setProfileOpen(true)}
            >
              {(profile?.display_name || session.user.email)[0].toUpperCase()}
            </button>
            <button
              className="icon"
              title="Выйти"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="calendar-wrap">
        <div className="toolbar">
          <div>
            <h1 className={`period-title ${viewMode}-period`}>{periodTitle}</h1>
            <p>{events.length} событий в календаре</p>
          </div>
          <div className="nav">
            <div className="view-switch" aria-label="Вид календаря">
              <button
                className={viewMode === "month" ? "active" : ""}
                onClick={() => setViewMode("month")}
              >
                Месяц
              </button>
              <button
                className={viewMode === "week" ? "active" : ""}
                onClick={() => {
                  setViewMode("week");
                  setCursor(new Date(`${selected}T12:00:00`));
                }}
              >
                Неделя
              </button>
            </div>
            <button
              className="ghost"
              onClick={() => {
                setCursor(new Date());
                setSelected(today);
              }}
            >
              Сегодня
            </button>
            <button className="icon" onClick={() => movePeriod(-1)}>
              <ChevronLeft />
            </button>
            <button className="icon" onClick={() => movePeriod(1)}>
              <ChevronRight />
            </button>
            <button
              className="primary add-event"
              onClick={() => setModal({ date: selected })}
            >
              <Plus size={18} /> Добавить событие
            </button>
          </div>
        </div>
        {notice && (
          <div
            className="notice"
            onClick={() =>
              notice.startsWith("Не удалось загрузить календарь")
                ? loadData()
                : setNotice("")
            }
          >
            {notice}
          </div>
        )}
        <div className="care-legend legend-desktop">
          {Object.entries(CARE_OPTIONS)
            .filter(([key]) => key !== "none")
            .map(([key, item]) => (
              <span key={key}>
                <i style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
        </div>
        <details className="care-legend-mobile">
          <summary>Обозначения</summary>
          <div>
            {Object.entries(CARE_OPTIONS)
              .filter(([key]) => key !== "none")
              .map(([key, item]) => (
                <span key={key}>
                  <i style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
          </div>
        </details>
        <section
          className={`day-agenda ${selectedEvents.length ? "has-events" : "is-empty"}`}
        >
          <div className="agenda-heading">
            <div>
              <p className="eyebrow">ВЫБРАННЫЙ ДЕНЬ</p>
              <h2>
                {selectedLabel}
                {!selectedEvents.length && <em> · Планов нет</em>}
              </h2>
            </div>
          </div>
          {selectedEvents.length > 0 && (
            <div className="agenda-list">
              {selectedEvents.map((e) => {
                const care = CARE_OPTIONS[e.care_by] || CARE_OPTIONS.none;
                return (
                  <button
                    key={e.id}
                    className={`agenda-event ${e.care_by && e.care_by !== "none" ? "has-care" : ""}`}
                    style={{
                      "--event": e.color,
                      "--care": care.color,
                      "--care-bg": care.background,
                    }}
                    onClick={() => setModal(e)}
                  >
                    <span className="agenda-time">
                      {e.all_day
                        ? "Весь день"
                        : `${fmtTime(e.starts_at)}–${fmtTime(e.ends_at)}`}
                    </span>
                    <span>
                      <b>{e.title}</b>
                      {e.description && <small>{e.description}</small>}
                      {e.care_by && e.care_by !== "none" && (
                        <small className="care-label">{care.label}</small>
                      )}
                    </span>
                    <i>
                      <span>{(e.creator?.display_name || "У")[0]}</span>
                      {e.creator?.display_name || "Участник"}
                    </i>
                  </button>
                );
              })}
            </div>
          )}
        </section>
        <section className={`calendar ${viewMode}-view`}>
          <div className="week-row">
            {headerLabels.map((x, i) => (
              <div
                key={x}
                className={
                  (viewMode === "day" ? days[0].getDay() % 6 === 0 : i > 4)
                    ? "weekend-label"
                    : ""
                }
              >
                {x}
                <small>{viewMode !== "month" ? days[i]?.getDate() : ""}</small>
              </div>
            ))}
          </div>
          <div className="grid">
            {days.map((d, i) => {
              const key = localDate(d),
                muted =
                  viewMode === "month" && d.getMonth() !== cursor.getMonth(),
                weekend =
                  viewMode === "month" ? i % 7 > 4 : d.getDay() % 6 === 0,
                eventCount = (byDay[key] || []).length,
                maxItems =
                  viewMode === "month" ? 10 : viewMode === "week" ? 8 : 12;
              return (
                <button
                  key={key}
                  className={`day ${muted ? "muted" : ""} ${selected === key ? "selected" : ""} ${weekend ? "weekend" : ""}`}
                  onClick={() => setSelected(key)}
                  onDoubleClick={() => setModal({ date: key })}
                >
                  <span className={today === key ? "today" : ""}>
                    <small className="mobile-weekday">
                      {d.toLocaleDateString("ru-RU", { weekday: "short" })}
                    </small>
                    {d.getDate()}
                  </span>
                  <div
                    className={`event-list ${viewMode === "month" && eventCount >= 3 ? "dense" : ""} ${viewMode === "month" && eventCount >= 5 ? "very-dense" : ""} ${viewMode === "month" && eventCount >= 7 ? "ultra-dense" : ""}`}
                  >
                    {(byDay[key] || []).slice(0, maxItems).map((e) => {
                      const care = CARE_OPTIONS[e.care_by] || CARE_OPTIONS.none;
                      return (
                        <div
                          key={e.id}
                          className={`event ${e.care_by && e.care_by !== "none" ? "has-care" : ""}`}
                          style={{
                            "--event": e.color,
                            "--care": care.color,
                            "--care-bg": care.background,
                          }}
                          onClick={(x) => {
                            x.stopPropagation();
                            setModal(e);
                          }}
                        >
                          <i style={{ background: e.color }} />
                          <b>
                            {e.all_day
                              ? "Весь день"
                              : `${fmtTime(e.starts_at)}–${fmtTime(e.ends_at)}`}
                          </b>
                          <span>{e.title}</span>
                          <small className="event-avatar">
                            {(e.creator?.display_name || "У")[0]}
                          </small>
                        </div>
                      );
                    })}
                    {(byDay[key] || []).length > maxItems && (
                      <small>ещё {(byDay[key] || []).length - maxItems}</small>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
      {modal && (
        <EventModal
          value={modal}
          onClose={() => setModal(null)}
          onSave={saveEvent}
          onDelete={removeEvent}
        />
      )}{" "}
      {profileOpen && (
        <ProfileModal
          profile={profile}
          email={session.user.email}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
        />
      )}{" "}
      {history && (
        <HistoryDrawer
          logs={logs}
          family={family}
          onRotateCode={rotateInviteCode}
          onClose={() => setHistory(false)}
        />
      )}
    </div>
  );
}

function ProfileModal({ profile, email, onSave, onClose }) {
  const [name, setName] = useState(profile?.display_name || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="modal profile-modal"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name, password);
        }}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">ВАШ ПРОФИЛЬ</p>
            <h2>Как вас называть?</h2>
          </div>
          <button type="button" className="icon" onClick={onClose}>
            <X />
          </button>
        </div>
        <p className="profile-email">{email}</p>
        <label>Имя в семейном календаре</label>
        <input
          autoFocus
          required
          maxLength="60"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, мама Лера"
        />
        <label>Новый пароль</label>
        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            minLength="6"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Оставьте пустым, если менять не нужно"
          />
          <button
            type="button"
            className="password-toggle"
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            title={showPassword ? "Скрыть пароль" : "Показать пароль"}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        <small className="profile-password-help">
          Не менее 6 символов. Пароль понадобится для входа без письма.
        </small>
        <div className="modal-actions">
          <span />
          <button type="button" className="ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="primary">Сохранить</button>
        </div>
      </form>
    </div>
  );
}

function Onboarding({ profile, session, onDone }) {
  const [name, setName] = useState(profile?.display_name || ""),
    [code, setCode] = useState(""),
    [error, setError] = useState("");
  async function join(event) {
    event.preventDefault();
    setError("");
    await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("id", session.user.id);
    const { error } = await supabase.rpc("join_family", {
      invite_code: code.trim().toUpperCase(),
    });
    if (error) setError(error.message);
    else onDone();
  }
  return (
    <main className="center auth-bg">
      <div className="card onboarding">
        <div className="brand-mark">С</div>
        <h1>Добро пожаловать!</h1>
        <p>Укажите своё имя и код приглашения, полученный от семьи.</p>
        <form className="join-family-form" onSubmit={join}>
          <label>Ваше имя</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Маша"
          />
          <label>Код приглашения</label>
          <input
            required
            className="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ABC123"
          />
          <button className="primary wide" disabled={!name || !code}>
            Присоединиться к семье
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    </main>
  );
}

const TIME_HOURS = Array.from({ length: 24 }, (_, index) => pad(index));
const TIME_MINUTES = Array.from({ length: 12 }, (_, index) => pad(index * 5));

function normalizeTime(value) {
  const raw = value.trim();
  let hours;
  let minutes;
  if (/^\d{1,2}:\d{1,2}$/.test(raw)) {
    [hours, minutes] = raw.split(":").map(Number);
  } else if (/^\d{3,4}$/.test(raw)) {
    hours = Number(raw.slice(0, -2));
    minutes = Number(raw.slice(-2));
  } else {
    return null;
  }
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

function TimeField({ label, value, onChange, align = "left" }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const [hour, minute] = value.split(":");
  const commitDraft = () => {
    const normalized = normalizeTime(draft);
    if (normalized) {
      onChange(normalized);
      setDraft(normalized);
    } else {
      setDraft(value);
    }
  };
  return (
    <div className={`time-field time-field-${align}`}>
      <label>{label}</label>
      <div className="custom-time-input">
        <input
          required
          inputMode="numeric"
          value={draft}
          aria-label={label}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            const next = event.target.value.replace(/[^\d:]/g, "").slice(0, 5);
            setDraft(next);
            const normalized = normalizeTime(next);
            if (normalized) onChange(normalized);
          }}
          onBlur={commitDraft}
        />
        <button
          type="button"
          className="time-trigger"
          aria-label={`Выбрать время: ${label}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setOpen((current) => !current)}
        >
          <Clock3 size={18} />
        </button>
        {open && (
          <div className="time-popover" role="dialog" aria-label={`Выбор времени: ${label}`}>
            <strong>Часы</strong>
            <div className="time-options hours-options">
              {TIME_HOURS.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={hour === item ? "active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChange(`${item}:${minute}`)}
                >
                  {item}
                </button>
              ))}
            </div>
            <strong>Минуты</strong>
            <div className="time-options minute-options">
              {TIME_MINUTES.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={minute === item ? "active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onChange(`${hour}:${item}`)}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="button" className="primary time-done" onClick={() => setOpen(false)}>
              Готово
            </button>
          </div>
        )}
      </div>
      <input
        className="native-time-input"
        required
        type="time"
        step="300"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function EventModal({ value, onClose, onSave, onDelete }) {
  const existing = !!value.id,
    start = existing ? new Date(value.starts_at) : null,
    end = existing ? new Date(value.ends_at) : null;
  const dateInputRef = useRef(null);
  const descriptionRef = useRef(null);
  const [copyMode, setCopyMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  const defaultUntil = new Date(
    existing ? start : new Date(`${value.date}T12:00:00`),
  );
  defaultUntil.setMonth(defaultUntil.getMonth() + 3);
  const [form, setForm] = useState({
    id: value.id,
    title: value.title || "",
    description: value.description || "",
    date: existing ? localDate(start) : value.date,
    start: existing ? fmtTime(start) : "09:00",
    end: existing ? fmtTime(end) : "10:00",
    nextDay:
      existing && !value.all_day ? localDate(end) > localDate(start) : false,
    allDay: value.all_day || false,
    color: value.color || CATEGORIES.family.color,
    category: value.category || "family",
    careBy: value.care_by || "none",
    recurrence: "none",
    repeatUntil: localDate(defaultUntil),
  });
  useEffect(() => {
    const element = descriptionRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 160)}px`;
  }, []);
  const isEditing = existing && !copyMode;
  const crossesMidnight = form.end <= form.start;
  function changeTime(field, nextValue) {
    setForm((current) => {
      const nextStart = field === "start" ? nextValue : current.start;
      const nextEnd = field === "end" ? nextValue : current.end;
      return {
        ...current,
        [field]: nextValue,
        nextDay: nextEnd <= nextStart,
      };
    });
  }
  function createCopy() {
    setCopyMode(true);
    setFormError("");
    setForm((current) => ({
      ...current,
      id: undefined,
      recurrence: "none",
    }));
    requestAnimationFrame(() => {
      dateInputRef.current?.focus();
      try {
        dateInputRef.current?.showPicker?.();
      } catch {
        // Some browsers only allow opening the native picker synchronously.
      }
    });
  }
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        className="modal"
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          if (!form.allDay && crossesMidnight && !form.nextDay) {
            setFormError("Укажите, что событие заканчивается на следующий день.");
            return;
          }
          setFormError("");
          setSaving(true);
          try {
            await onSave(form);
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">
              {copyMode ? "КОПИЯ СОБЫТИЯ" : existing ? "РЕДАКТИРОВАНИЕ" : "НОВОЕ СОБЫТИЕ"}
            </p>
            <h2>
              {copyMode
                ? "Создание копии события"
                : existing
                  ? "Редактировать событие"
                  : "Добавить событие"}
            </h2>
          </div>
          <button type="button" className="icon" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="modal-body">
        <label>Название</label>
        <input
          autoFocus={!copyMode}
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Что планируем?"
        />
        <div className="date-all-day-row">
          <div className="date-field">
            <label>Дата</label>
            <input
              ref={dateInputRef}
              required
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm({
                  ...form,
                  date: e.target.value,
                  repeatUntil:
                    e.target.value > form.repeatUntil
                      ? e.target.value
                      : form.repeatUntil,
                })
              }
            />
          </div>
          <label className="all-day-toggle">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
            />
            <span>Весь день</span>
          </label>
        </div>
        {!form.allDay && (
          <>
            <div className="time-row">
              <TimeField
                label="Начало"
                value={form.start}
                onChange={(nextValue) => changeTime("start", nextValue)}
              />
              <TimeField
                label="Конец"
                value={form.end}
                align="right"
                onChange={(nextValue) => changeTime("end", nextValue)}
              />
            </div>
            {crossesMidnight && (
              <label className="next-day-toggle">
                <input
                  type="checkbox"
                  checked={form.nextDay}
                  onChange={(event) =>
                    setForm({ ...form, nextDay: event.target.checked })
                  }
                />
                <span>Заканчивается на следующий день</span>
              </label>
            )}
          </>
        )}
        {!existing && !copyMode && (
          <div className="repeat-box">
            <div>
              <label>Повторять</label>
              <select
                value={form.recurrence}
                onChange={(e) =>
                  setForm({ ...form, recurrence: e.target.value })
                }
              >
                <option value="none">Не повторять</option>
                <option value="daily">Каждый день</option>
                <option value="weekdays">Каждый день по будням</option>
                <option value="weekly">Каждую неделю</option>
                <option value="monthly">Каждый месяц</option>
              </select>
            </div>
            {form.recurrence !== "none" && (
              <div>
                <label>До какой даты</label>
                <input
                  required
                  min={form.date}
                  type="date"
                  value={form.repeatUntil}
                  onChange={(e) =>
                    setForm({ ...form, repeatUntil: e.target.value })
                  }
                />
              </div>
            )}
          </div>
        )}
        <label>Описание</label>
        <textarea
          ref={descriptionRef}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          onInput={(event) => {
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
          }}
          placeholder="Детали, адрес, что взять с собой…"
        />
        <label>Категория</label>
        <div className="category-picker">
          {Object.entries(CATEGORIES).map(([key, item]) => (
            <button
              type="button"
              key={key}
              className={form.category === key ? "active" : ""}
              onClick={() =>
                setForm({ ...form, category: key, color: item.color })
              }
            >
              <i style={{ background: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
        <label>Кто с детьми?</label>
        <div className="care-picker">
          {Object.entries(CARE_OPTIONS).map(([key, item]) => (
            <button
              type="button"
              key={key}
              className={form.careBy === key ? "active" : ""}
              style={{ "--care": item.color, "--care-bg": item.background }}
              onClick={() => setForm({ ...form, careBy: key })}
            >
              {key !== "none" && <i />}
              {item.label}
            </button>
          ))}
        </div>
        </div>
        <div className="modal-footer">
          {formError && <p className="form-error">{formError}</p>}
          <div className="modal-actions">
          {isEditing && (
            <button
              type="button"
              className="danger"
              onClick={() => onDelete(value.id)}
            >
              Удалить
            </button>
          )}
          {isEditing && (
            <button type="button" className="copy-action" onClick={createCopy}>
              <Copy size={17} /> Создать копию
            </button>
          )}
          <span />
          <button type="button" className="ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="primary" disabled={saving}>
            {saving
              ? "Сохранение…"
              : copyMode
                ? "Сохранить копию"
                : "Сохранить"}
          </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function HistoryDrawer({ logs, family, onRotateCode, onClose }) {
  const verbs = {
    created: "добавил(а)",
    updated: "изменил(а)",
    deleted: "удалил(а)",
  };
  return (
    <div
      className="overlay drawer-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="drawer">
        <div className="modal-head">
          <div>
            <p className="eyebrow">ЖУРНАЛ ИЗМЕНЕНИЙ</p>
            <h2>История семьи</h2>
          </div>
          <button className="icon" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="invite">
          <Users />
          <div>
            <small>Код приглашения</small>
            <b>{family.invite_code}</b>
          </div>
          <div className="invite-actions">
            <button
              className="ghost"
              onClick={() => navigator.clipboard.writeText(family.invite_code)}
            >
              Копировать
            </button>
            {family.memberRole === "owner" && (
              <button className="change-code" onClick={onRotateCode}>
                Сменить код
              </button>
            )}
          </div>
        </div>
        <div className="timeline">
          {logs.length ? (
            logs.map((l) => (
              <div className="log" key={l.id}>
                <span className={`dot ${l.action}`} />
                <div>
                  <p>
                    <b>{l.actor?.display_name || "Участник"}</b>{" "}
                    {verbs[l.action]} событие
                  </p>
                  <strong>{l.snapshot?.title || "Без названия"}</strong>
                  <small>
                    <Clock3 size={13} />
                    {fmtLogDate(l.created_at)}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="empty">История пока пуста.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
