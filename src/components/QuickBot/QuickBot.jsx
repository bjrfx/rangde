import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, MessageCircleMore, Sparkles, X } from 'lucide-react';
import {
  createQuickBotAPI,
  getActions,
  getLocationOptions,
  getStepProgress,
  normalizePhoneDigits,
} from './QuickBotFlow';
import quickBotConfig from './quickbot.config';
import './QuickBot.css';

const INITIAL_IDENTIFY = {
  phone: '',
  email: '',
};

const INITIAL_BOOK = {
  locationId: '',
  date: '',
  time: '',
  persons: 2,
  name: '',
  email: '',
  phone: '',
  special_requests: '',
};

const INITIAL_UPDATE = {
  date: '',
  time: '',
  persons: 2,
  special_requests: '',
};

const INITIAL_CATERING = {
  event_type: '',
  event_date: '',
  guests: 20,
  event_location: '',
  notes: '',
  name: '',
  email: '',
  phone: '',
};

const INITIAL_CONTACT = {
  name: '',
  email: '',
  phone: '',
  message: '',
};

const BOOK_STEPS = [
  { id: 'location', label: 'Select Location' },
  { id: 'date', label: 'Date' },
  { id: 'time', label: 'Time' },
  { id: 'persons', label: 'Guests' },
  { id: 'name', label: 'Name' },
  { id: 'email', label: 'Email' },
  { id: 'phone', label: 'Phone' },
  { id: 'special', label: 'Special Requests' },
];

function useTypingText(value, speed = 18) {
  const [text, setText] = useState('');

  useEffect(() => {
    let timer;
    setText('');

    if (!value) {
      return undefined;
    }

    let index = 0;
    const tick = () => {
      index += 1;
      setText(value.slice(0, index));
      if (index < value.length) {
        timer = window.setTimeout(tick, speed);
      }
    };

    timer = window.setTimeout(tick, speed);

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [value, speed]);

  return text;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizePhoneInput(value) {
  return normalizePhoneDigits(value).slice(0, 10);
}

function buildProgressMeta(screen, step) {
  if (screen === 'book') {
    return {
      step,
      total: BOOK_STEPS.length,
      label: BOOK_STEPS[step]?.label || 'Booking',
    };
  }
  return null;
}

function filterMenuCategoryMatch(categories, label) {
  const normalized = String(label || '').toLowerCase();
  return categories.find((item) => {
    const name = String(item.name || '').toLowerCase();
    const slug = String(item.slug || '').toLowerCase();
    return name.includes(normalized) || slug.includes(normalized.replace(/\s+/g, '-'));
  });
}

export default function QuickBot({ config = quickBotConfig }) {
  const api = useMemo(() => createQuickBotAPI(config), [config]);

  const [isOpen, setIsOpen] = useState(false);
  const [screen, setScreen] = useState('identify');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [identity, setIdentity] = useState(INITIAL_IDENTIFY);
  const [lookupReservations, setLookupReservations] = useState([]);
  const [hasReservations, setHasReservations] = useState(false);

  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  const [book, setBook] = useState(INITIAL_BOOK);
  const [bookStep, setBookStep] = useState(0);

  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reservationUpdate, setReservationUpdate] = useState(INITIAL_UPDATE);

  const [menuLocationId, setMenuLocationId] = useState(config.locations?.[0]?.id || '');
  const [menuSearch, setMenuSearch] = useState('');
  const [menuItems, setMenuItems] = useState([]);

  const [catering, setCatering] = useState(INITIAL_CATERING);
  const [contact, setContact] = useState(INITIAL_CONTACT);

  const [successMessage, setSuccessMessage] = useState('');

  const activeMenuLocation = useMemo(
    () => locationOptions.find((location) => location.id === menuLocationId) || locationOptions[0] || null,
    [menuLocationId, locationOptions]
  );

  const progressMeta = buildProgressMeta(screen, bookStep);
  const progress = getStepProgress(progressMeta);

  const botMessage = hasReservations
    ? 'Welcome back! We found your reservations.'
    : 'Welcome! How can we assist you?';
  const typingMessage = useTypingText(screen === 'actions' ? botMessage : '', 14);

  const shouldHideByRoute = config.hideOnAdminRoutes && window.location.pathname.startsWith('/admin');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function preload() {
      try {
        setLoading(true);
        setError('');
        const [restaurantRows, categoryRows] = await Promise.all([
          api.getRestaurants(),
          api.getCategories(activeMenuLocation),
        ]);
        if (cancelled) return;
        setRestaurants(restaurantRows);
        setCategories(categoryRows);
        const locationList = getLocationOptions(config, restaurantRows);
        setLocationOptions(locationList);
        if (!menuLocationId && locationList[0]) {
          setMenuLocationId(locationList[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load quick bot resources.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    preload();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!activeMenuLocation || !isOpen) return;
    api.getCategories(activeMenuLocation)
      .then(setCategories)
      .catch(() => {
        setCategories([]);
      });
  }, [menuLocationId, isOpen]);

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  if (shouldHideByRoute) return null;

  function pushAndGo(nextScreen) {
    setHistory((prev) => [...prev, screen]);
    setScreen(nextScreen);
    setError('');
  }

  function goBack() {
    setError('');
    setHistory((prev) => {
      if (!prev.length) return prev;
      const stack = [...prev];
      const last = stack.pop();
      if (last) setScreen(last);
      return stack;
    });
  }

  function openQuickBot() {
    setIsOpen((prev) => !prev);
  }

  async function handleIdentifySubmit(event) {
    event.preventDefault();
    const normalizedPhone = normalizePhoneDigits(identity.phone);
    if (!identity.email || normalizedPhone.length !== 10) {
      setError('Please enter a valid email and phone number.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const reservations = await api.findReservations(identity);
      setLookupReservations(reservations);
      setHasReservations(reservations.length > 0);

      setBook((prev) => ({
        ...prev,
        email: identity.email,
        phone: identity.phone,
      }));
      setCatering((prev) => ({
        ...prev,
        email: identity.email,
        phone: identity.phone,
      }));
      setContact((prev) => ({
        ...prev,
        email: identity.email,
        phone: identity.phone,
      }));

      pushAndGo('actions');
    } catch (err) {
      setError(err.message || 'Unable to verify your details.');
    } finally {
      setLoading(false);
    }
  }

  function handleAction(actionId) {
    if (actionId === 'book-table') {
      setBookStep(0);
      setBook((prev) => ({
        ...INITIAL_BOOK,
        email: identity.email,
        phone: identity.phone,
        date: todayISO(),
      }));
      pushAndGo('book');
      return;
    }

    if (actionId === 'view-reservations') {
      pushAndGo('view-reservations');
      return;
    }

    if (actionId === 'update-reservation') {
      pushAndGo('choose-reservation-to-update');
      return;
    }

    if (actionId === 'search-menu') {
      setMenuItems([]);
      setMenuSearch('');
      pushAndGo('search-menu');
      return;
    }

    if (actionId === 'view-menu') {
      setMenuItems([]);
      pushAndGo('view-menu');
      return;
    }

    if (actionId === 'catering') {
      setCatering((prev) => ({ ...prev, email: identity.email, phone: identity.phone }));
      pushAndGo('catering');
      return;
    }

    if (actionId === 'contact') {
      setContact((prev) => ({ ...prev, email: identity.email, phone: identity.phone }));
      pushAndGo('contact');
      return;
    }

    if (actionId === 'locations') {
      pushAndGo('locations');
      return;
    }

    if (actionId === 'call') {
      pushAndGo('call');
    }
  }

  function handleBookNext(event) {
    event.preventDefault();

    const validations = [
      !!book.locationId,
      !!book.date,
      !!book.time,
      Number(book.persons) > 0,
      normalizePhoneDigits(book.name).length === 0 && !!book.name,
      !!book.email,
      normalizePhoneDigits(book.phone).length === 10,
      true,
    ];

    if (!validations[bookStep]) {
      setError('Please complete this step before continuing.');
      return;
    }

    setError('');

    if (bookStep === BOOK_STEPS.length - 1) {
      submitBooking();
      return;
    }

    setBookStep((prev) => prev + 1);
  }

  async function submitBooking() {
    try {
      setLoading(true);
      setError('');
      const location = locationOptions.find((item) => item.id === book.locationId) || null;
      await api.createReservation({
        ...book,
        location,
        restaurants,
      });

      setSuccessMessage('Your reservation has been confirmed.');
      setLookupReservations(await api.findReservations(identity));
      setHasReservations(true);
      pushAndGo('success');
    } catch (err) {
      setError(err.message || 'Failed to submit reservation.');
    } finally {
      setLoading(false);
    }
  }

  function startUpdateReservation(item) {
    setSelectedReservation(item);
    setReservationUpdate({
      date: item.date || todayISO(),
      time: item.time || '',
      persons: item.persons || 2,
      special_requests: item.special_requests || '',
    });
    pushAndGo('update-reservation');
  }

  async function submitReservationUpdate(event) {
    event.preventDefault();
    if (!selectedReservation) {
      setError('Please select a reservation first.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.updateReservation({
        id: selectedReservation.id,
        lookup_email: identity.email,
        lookup_phone: identity.phone,
        ...reservationUpdate,
      });
      const refreshed = await api.findReservations(identity);
      setLookupReservations(refreshed);
      setSuccessMessage('Your reservation has been updated.');
      pushAndGo('success');
    } catch (err) {
      setError(err.message || 'Failed to update reservation.');
    } finally {
      setLoading(false);
    }
  }

  async function runMenuSearch(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      const results = await api.searchMenu({ location: activeMenuLocation, query: menuSearch });
      setMenuItems(results);
    } catch (err) {
      setError(err.message || 'Failed to search menu items.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMenuByCategory(categoryLabel) {
    try {
      setLoading(true);
      setError('');
      let categoryId = '';
      const foundCategory = filterMenuCategoryMatch(categories, categoryLabel);
      if (foundCategory) {
        categoryId = foundCategory.id;
      }
      const results = await api.getMenuByCategory({
        location: activeMenuLocation,
        categoryId,
      });
      const categoryNormalized = String(categoryLabel || '').toLowerCase();
      const filtered = results.filter((item) => {
        if (!categoryNormalized) return true;
        const categoryText = String(item.category_name || '').toLowerCase();
        return categoryText.includes(categoryNormalized) || !foundCategory;
      });
      setMenuItems(filtered.length ? filtered : results);
    } catch (err) {
      setError(err.message || 'Failed to fetch category menu.');
    } finally {
      setLoading(false);
    }
  }

  async function submitCatering(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      const locationName = locationOptions.find((item) => item.id === catering.event_location)?.name || catering.event_location;
      await api.submitCatering({ ...catering, event_location: locationName });
      setSuccessMessage('Your catering request has been submitted.');
      pushAndGo('success');
    } catch (err) {
      setError(err.message || 'Failed to submit catering request.');
    } finally {
      setLoading(false);
    }
  }

  async function submitContact(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      await api.submitContact(contact);
      setSuccessMessage('Your message has been sent.');
      pushAndGo('success');
    } catch (err) {
      setError(err.message || 'Failed to submit contact form.');
    } finally {
      setLoading(false);
    }
  }

  function renderBookingStep() {
    if (bookStep === 0) {
      return (
        <div>
          <label className="quickbot-label">Location</label>
          <select
            className="quickbot-select"
            value={book.locationId}
            onChange={(event) => setBook((prev) => ({ ...prev, locationId: event.target.value }))}
          >
            <option value="">Select location</option>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (bookStep === 1) {
      return (
        <div>
          <label className="quickbot-label">Reservation Date</label>
          <input
            className="quickbot-input"
            type="date"
            min={todayISO()}
            value={book.date}
            onChange={(event) => setBook((prev) => ({ ...prev, date: event.target.value }))}
          />
        </div>
      );
    }

    if (bookStep === 2) {
      return (
        <div>
          <label className="quickbot-label">Reservation Time</label>
          <input
            className="quickbot-input"
            type="time"
            value={book.time}
            onChange={(event) => setBook((prev) => ({ ...prev, time: event.target.value }))}
          />
        </div>
      );
    }

    if (bookStep === 3) {
      return (
        <div>
          <label className="quickbot-label">Number of Guests</label>
          <input
            className="quickbot-input"
            type="number"
            min="1"
            max="30"
            value={book.persons}
            onChange={(event) => setBook((prev) => ({ ...prev, persons: event.target.value }))}
          />
        </div>
      );
    }

    if (bookStep === 4) {
      return (
        <div>
          <label className="quickbot-label">Your Name</label>
          <input
            className="quickbot-input"
            value={book.name}
            onChange={(event) => setBook((prev) => ({ ...prev, name: event.target.value }))}
          />
        </div>
      );
    }

    if (bookStep === 5) {
      return (
        <div>
          <label className="quickbot-label">Email</label>
          <input
            className="quickbot-input"
            type="email"
            value={book.email}
            onChange={(event) => setBook((prev) => ({ ...prev, email: event.target.value }))}
          />
        </div>
      );
    }

    if (bookStep === 6) {
      return (
        <div>
          <label className="quickbot-label">Phone</label>
          <input
            className="quickbot-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
            value={book.phone}
              onChange={(event) => setBook((prev) => ({ ...prev, phone: sanitizePhoneInput(event.target.value) }))}
          />
        </div>
      );
    }

    return (
      <div>
        <label className="quickbot-label">Special Requests</label>
        <textarea
          className="quickbot-textarea"
          value={book.special_requests}
          onChange={(event) => setBook((prev) => ({ ...prev, special_requests: event.target.value }))}
          placeholder="Allergies, celebrations, seating preferences..."
        />
      </div>
    );
  }

  function renderScreen() {
    if (screen === 'identify') {
      return (
        <form className="quickbot-form" onSubmit={handleIdentifySubmit}>
          <div className="quickbot-bubble">Enter your phone and email so we can quickly assist you.</div>
          <div>
            <label className="quickbot-label">Phone Number</label>
            <input
              className="quickbot-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={identity.phone}
              onChange={(event) => setIdentity((prev) => ({ ...prev, phone: sanitizePhoneInput(event.target.value) }))}
              placeholder="6135551234"
            />
          </div>
          <div>
            <label className="quickbot-label">Email Address</label>
            <input
              className="quickbot-input"
              type="email"
              value={identity.email}
              onChange={(event) => setIdentity((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="you@example.com"
            />
          </div>
          <button className="quickbot-btn primary" type="submit" disabled={loading}>
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      );
    }

    if (screen === 'actions') {
      const actions = getActions({ hasReservations });
      return (
        <div>
          <div className="quickbot-bubble">
            {typingMessage || '...'}
            {!typingMessage && (
              <span className="quickbot-typing">
                <span className="quickbot-dot" />
                <span className="quickbot-dot" />
                <span className="quickbot-dot" />
              </span>
            )}
          </div>
          <div className="quickbot-grid">
            {actions.map((action) => (
              <button key={action.id} className="quickbot-btn secondary" onClick={() => handleAction(action.id)}>
                {action.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (screen === 'book') {
      return (
        <form className="quickbot-form" onSubmit={handleBookNext}>
          <div className="quickbot-bubble">{BOOK_STEPS[bookStep]?.label}</div>
          {renderBookingStep()}
          <div className="quickbot-grid two">
            <button
              type="button"
              className="quickbot-btn ghost"
              onClick={() => {
                if (bookStep === 0) {
                  goBack();
                } else {
                  setBookStep((prev) => Math.max(prev - 1, 0));
                }
              }}
            >
              Back
            </button>
            <button type="submit" className="quickbot-btn primary" disabled={loading}>
              {bookStep === BOOK_STEPS.length - 1 ? (loading ? 'Submitting...' : 'Submit') : 'Next'}
            </button>
          </div>
        </form>
      );
    }

    if (screen === 'view-reservations') {
      return (
        <div className="quickbot-grid">
          {!lookupReservations.length && <div className="quickbot-empty">No reservations found for this profile.</div>}
          {lookupReservations.map((item) => (
            <div className="quickbot-card" key={item.id}>
              <h4 className="quickbot-card-title">{item.restaurant_name || 'Reservation'}</h4>
              <p className="quickbot-meta">
                Date: {item.date}<br />
                Time: {item.time}<br />
                Guests: {item.persons}<br />
                Status: {item.status}
              </p>
              <div className="quickbot-grid two">
                {/* <button className="quickbot-btn secondary" onClick={() => startUpdateReservation(item)}>
                  Update Reservation
                </button> */}
                <button className="quickbot-btn secondary" onClick={() => pushAndGo('cancel-fallback')}>
                  Update Reservation
                </button>
                <button className="quickbot-btn ghost" onClick={() => pushAndGo('cancel-fallback')}>
                  Cancel Reservation
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (screen === 'choose-reservation-to-update') {
      return (
        <div className="quickbot-grid">
          <div className="quickbot-bubble">Select a reservation to update.</div>
          {!lookupReservations.length && <div className="quickbot-empty">No reservations found for this profile.</div>}
          {lookupReservations.map((item) => (
            <button key={item.id} className="quickbot-btn secondary" onClick={() => startUpdateReservation(item)}>
              {item.date} · {item.time} · {item.persons} guests
            </button>
          ))}
        </div>
      );
    }

    if (screen === 'update-reservation') {
      return (
        <form className="quickbot-form" onSubmit={submitReservationUpdate}>
          <div className="quickbot-bubble">Update Reservation</div>
          <div>
            <label className="quickbot-label">Date</label>
            <input
              type="date"
              className="quickbot-input"
              value={reservationUpdate.date}
              min={todayISO()}
              onChange={(event) => setReservationUpdate((prev) => ({ ...prev, date: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Time</label>
            <input
              type="time"
              className="quickbot-input"
              value={reservationUpdate.time}
              onChange={(event) => setReservationUpdate((prev) => ({ ...prev, time: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Guests</label>
            <input
              type="number"
              min="1"
              max="30"
              className="quickbot-input"
              value={reservationUpdate.persons}
              onChange={(event) => setReservationUpdate((prev) => ({ ...prev, persons: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Special Request</label>
            <textarea
              className="quickbot-textarea"
              value={reservationUpdate.special_requests}
              onChange={(event) => setReservationUpdate((prev) => ({ ...prev, special_requests: event.target.value }))}
            />
          </div>
          <button className="quickbot-btn primary" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Save Update'}
          </button>
        </form>
      );
    }

    if (screen === 'search-menu') {
      return (
        <div className="quickbot-form">
          <form onSubmit={runMenuSearch} className="quickbot-form">
            <label className="quickbot-label">Search Menu Item</label>
            <input
              className="quickbot-input"
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Type dish name..."
            />
            <label className="quickbot-label">Location</label>
            <select
              className="quickbot-select"
              value={menuLocationId}
              onChange={(event) => setMenuLocationId(event.target.value)}
            >
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <button className="quickbot-btn primary" type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          {!!menuItems.length && (
            <div className="quickbot-grid">
              {menuItems.map((item) => (
                <div className="quickbot-card" key={item.id}>
                  <div className="quickbot-item-row">
                    <img className="quickbot-item-image" src={item.image_url || '/logo192.png'} alt={item.name} />
                    <div>
                      <h4 className="quickbot-card-title">{item.name}</h4>
                      <p className="quickbot-meta">
                        ${item.price.toFixed(2)}<br />
                        {item.description || 'No description available.'}
                      </p>
                      <span className="quickbot-badge">Spice: {item.spice_level || 'medium'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && !menuItems.length && <div className="quickbot-empty">Search results will appear here.</div>}
        </div>
      );
    }

    if (screen === 'view-menu') {
      return (
        <div className="quickbot-form">
          <label className="quickbot-label">Location</label>
          <select className="quickbot-select" value={menuLocationId} onChange={(event) => setMenuLocationId(event.target.value)}>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <div className="quickbot-grid">
            {config.menuCategories.map((category) => (
              <button
                key={category.key}
                className="quickbot-btn secondary"
                onClick={() => loadMenuByCategory(category.label)}
              >
                {category.label}
              </button>
            ))}
          </div>
          {!!menuItems.length && (
            <div className="quickbot-grid">
              {menuItems.map((item) => (
                <div className="quickbot-card" key={item.id}>
                  <h4 className="quickbot-card-title">{item.name}</h4>
                  <p className="quickbot-meta">
                    ${item.price.toFixed(2)}<br />
                    {item.description || 'No description available.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (screen === 'catering') {
      return (
        <form className="quickbot-form" onSubmit={submitCatering}>
          <div>
            <label className="quickbot-label">Event Type</label>
            <input
              className="quickbot-input"
              value={catering.event_type}
              onChange={(event) => setCatering((prev) => ({ ...prev, event_type: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Event Date</label>
            <input
              type="date"
              min={todayISO()}
              className="quickbot-input"
              value={catering.event_date}
              onChange={(event) => setCatering((prev) => ({ ...prev, event_date: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Number of Guests</label>
            <input
              type="number"
              min="10"
              className="quickbot-input"
              value={catering.guests}
              onChange={(event) => setCatering((prev) => ({ ...prev, guests: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Location</label>
            <select
              className="quickbot-select"
              value={catering.event_location}
              onChange={(event) => setCatering((prev) => ({ ...prev, event_location: event.target.value }))}
            >
              <option value="">Select location</option>
              {locationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="quickbot-label">Notes</label>
            <textarea
              className="quickbot-textarea"
              value={catering.notes}
              onChange={(event) => setCatering((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Name</label>
            <input
              className="quickbot-input"
              value={catering.name}
              onChange={(event) => setCatering((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Email</label>
            <input
              type="email"
              className="quickbot-input"
              value={catering.email}
              onChange={(event) => setCatering((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Phone</label>
            <input
              className="quickbot-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={catering.phone}
              onChange={(event) => setCatering((prev) => ({ ...prev, phone: sanitizePhoneInput(event.target.value) }))}
            />
          </div>
          <button className="quickbot-btn primary" type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Catering Request'}
          </button>
        </form>
      );
    }

    if (screen === 'contact') {
      return (
        <form className="quickbot-form" onSubmit={submitContact}>
          <div>
            <label className="quickbot-label">Name</label>
            <input
              className="quickbot-input"
              value={contact.name}
              onChange={(event) => setContact((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Email</label>
            <input
              type="email"
              className="quickbot-input"
              value={contact.email}
              onChange={(event) => setContact((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Phone</label>
            <input
              className="quickbot-input"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={contact.phone}
              onChange={(event) => setContact((prev) => ({ ...prev, phone: sanitizePhoneInput(event.target.value) }))}
            />
          </div>
          <div>
            <label className="quickbot-label">Message</label>
            <textarea
              className="quickbot-textarea"
              value={contact.message}
              onChange={(event) => setContact((prev) => ({ ...prev, message: event.target.value }))}
            />
          </div>
          <button className="quickbot-btn primary" type="submit" disabled={loading}>
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      );
    }

    if (screen === 'locations') {
      return (
        <div className="quickbot-grid">
          {restaurants.length === 0 && <div className="quickbot-empty">No locations available right now.</div>}
          {restaurants.map((location) => (
            <div key={location.id} className="quickbot-card">
              <h4 className="quickbot-card-title">{location.name}</h4>
              <p className="quickbot-meta">
                {location.address}<br />
                {location.phone || 'Phone not available'}<br />
                {location.opening_hours}
              </p>
              <div className="quickbot-grid two">
                <button
                  className="quickbot-btn secondary"
                  onClick={() => {
                    const preferred = locationOptions.find((item) => item.slug === location.slug) || locationOptions[0];
                    if (preferred) setMenuLocationId(preferred.id);
                    pushAndGo('view-menu');
                  }}
                >
                  View Menu
                </button>
                <button
                  className="quickbot-btn primary"
                  onClick={() => {
                    const preferred = locationOptions.find((item) => item.slug === location.slug) || locationOptions[0];
                    setBook((prev) => ({ ...prev, locationId: preferred?.id || prev.locationId }));
                    setBookStep(0);
                    pushAndGo('book');
                  }}
                >
                  Book Table
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (screen === 'call') {
      return (
        <div className="quickbot-grid">
          <div className="quickbot-bubble">Choose a location to call directly.</div>
          {locationOptions.map((location) => (
            <a
              key={location.id}
              href={location.tel ? `tel:${location.tel}` : undefined}
              className="quickbot-btn secondary"
              onClick={(event) => {
                if (!location.tel) {
                  event.preventDefault();
                  setError('Phone number is currently unavailable for this location.');
                }
              }}
            >
              {location.name} {location.phone || ''}
            </a>
          ))}
        </div>
      );
    }

    if (screen === 'cancel-fallback') {
      return (
        <div className="quickbot-form">
          <div className="quickbot-bubble">
            Cancellation requires staff confirmation. Please call us and we will process it.
            <br />
            {locationOptions.map((location) => (
            <a
              key={location.id}
              href={location.tel ? `tel:${location.tel}` : undefined}
              className="quickbot-btn secondary"
              onClick={(event) => {
                if (!location.tel) {
                  event.preventDefault();
                  setError('Phone number is currently unavailable for this location.');
                }
              }}
            >
              {location.name} {location.phone || ''}
            </a>
          ))}
          </div>
          <button
            className="quickbot-btn primary"
            onClick={() => {
              setContact((prev) => ({
                ...prev,
                email: prev.email || identity.email,
                phone: prev.phone || identity.phone,
                message:
                  prev.message ||
                  'Please cancel my reservation. I can confirm details by phone/email if needed.',
              }));
              pushAndGo('contact');
            }}
          >
            Continue to Contact Us
          </button>
        </div>
      );
    }

    if (screen === 'success') {
      return (
        <div className="quickbot-form">
          <div className="quickbot-bubble">{successMessage || 'Done successfully.'}</div>
          <button className="quickbot-btn primary" onClick={() => setScreen('actions')}>
            Back to Actions
          </button>
        </div>
      );
    }

    return <div className="quickbot-empty">Select an option to continue.</div>;
  }

  return (
    <div className="quickbot-root" style={{ '--qb-primary': config.themeColor }}>
      <div className={`quickbot-panel ${isOpen ? 'open' : ''}`} role="dialog" aria-label="Quick assistant panel">
        <div className="quickbot-header">
          {history.length > 0 ? (
            <button className="quickbot-icon-btn" onClick={goBack} aria-label="Back">
              <ChevronLeft size={16} />
            </button>
          ) : (
            <span className="quickbot-icon-btn" aria-hidden="true">
              <Sparkles size={15} />
            </span>
          )}
          <div className="quickbot-title-wrap">
            <h3 className="quickbot-title">{config.assistantName || 'Quick Bot'}</h3>
            <p className="quickbot-subtitle">Fast help for reservations, menu, catering and contact.</p>
          </div>
          <button className="quickbot-icon-btn" onClick={() => setIsOpen(false)} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        {progressMeta && (
          <div className="quickbot-progress" aria-hidden="true">
            <div className="quickbot-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="quickbot-body">
          {error && <div className="quickbot-empty">{error}</div>}
          {renderScreen()}
          <div className="quickbot-footer-gap" />
        </div>
      </div>

      <button className="quickbot-fab" onClick={openQuickBot} aria-label="Toggle Quick Bot">
        {isOpen ? <X size={24} /> : <MessageCircleMore size={24} />}
      </button>
    </div>
  );
}
