import { useState, useEffect } from 'react';
import { wchl_hackathon_backend } from 'declarations/wchl-hackathon-backend';

function App() {
  const [ads, setAds] = useState([]);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    contact: '',
    technologies: '',
    development_time_months: '',
    link: '',
  });
  const [responseMessage, setResponseMessage] = useState('');

  // Pobierz ogłoszenia po załadowaniu komponentu
  useEffect(() => {
    wchl_hackathon_backend.get_ads().then((data) => {
      console.log('Received ads:', data);  // <-- do debugowania
      setAds(data);
    });
  }, []);

  // Obsługa zmiany w formularzu
  function handleChange(event) {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }

  // Obsługa wysłania formularza
  async function handleSubmit(event) {
    event.preventDefault();
    const {
      title,
      description,
      contact,
      technologies,
      development_time_months,
      link,
    } = formState;

    const res = await wchl_hackathon_backend.add_ad(
      title,
      description,
      contact,
      technologies,
      Number(development_time_months),
      link
    );

    if (res.success) {
      setResponseMessage('Ogłoszenie dodane pomyślnie!');
      setFormState({
        title: '',
        description: '',
        contact: '',
        technologies: '',
        development_time_months: '',
        link: '',
      });
      const updatedAds = await wchl_hackathon_backend.get_ads();
      setAds(updatedAds);
    } else {
      setResponseMessage(`Błąd: ${res.error || 'Nieznany błąd'}`);
    }
  }

  return (
    <main>
      <h1>Tablica ogłoszeń</h1>

      <form onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="Tytuł projektu"
          value={formState.title}
          onChange={handleChange}
          required
          minLength={4}
        />
        <textarea
          name="description"
          placeholder="Opis"
          value={formState.description}
          onChange={handleChange}
          required
          minLength={16}
        />
        <input
          name="contact"
          placeholder="Kontakt"
          value={formState.contact}
          onChange={handleChange}
          required
        />
        <input
          name="technologies"
          placeholder="Technologie"
          value={formState.technologies}
          onChange={handleChange}
          required
        />
        <input
          name="development_time_months"
          placeholder="Czas rozwinięcia (miesiące)"
          type="number"
          value={formState.development_time_months}
          onChange={handleChange}
          required
          min={0}
        />
        <input
          name="link"
          placeholder="Link do projektu"
          value={formState.link}
          onChange={handleChange}
        />

        <button type="submit">Dodaj ogłoszenie</button>
      </form>

      {responseMessage && <p>{responseMessage}</p>}

      <section>
        <h2>Dodane ogłoszenia</h2>
        <ul>
          {ads.length === 0 && <li>Brak ogłoszeń</li>}
          {ads.map(({ id, ad }) => (
            <li key={id.toString()}> {/* toString(), bo id to BigInt */}
              <h3>{ad.title}</h3>
              <p>{ad.description}</p>
              <p><b>Kontakt:</b> {ad.contact}</p>
              <p><b>Technologie:</b> {ad.technologies}</p>
              <p><b>Czas rozwinięcia:</b> {ad.development_time_months} miesiące/miesięcy</p>
              {ad.link && (
                <p>
                  <a href={ad.link} target="_blank" rel="noreferrer">
                    Link do projektu
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>

      </section>
    </main>
  );
}

export default App;
