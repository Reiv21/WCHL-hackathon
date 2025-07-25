import { useState, useEffect } from 'react';
import { wchl_hackathon_backend } from 'declarations/wchl-hackathon-backend';

function App() {
  const [ads, setAds] = useState([]);
  const [search, setSearch] = useState("");
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    contact: '',
    technologies: '',
    development_time_months: '',
    link: '',
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    wchl_hackathon_backend.get_ads().then(setAds);
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }

  function handleSearch(event) {
    setSearch(event.target.value);
  }

  function handleVote(isVoteUp, adId) {
    
  }

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
      setResponseMessage('Post dodany pomyślnie!');
      setFormState({
        title: '',
        description: '',
        contact: '',
        technologies: '',
        development_time_months: '',
        link: '',
      });
      setShowForm(false);
      const updatedAds = await wchl_hackathon_backend.get_ads();
      setAds(updatedAds);
    } else {
      setResponseMessage(`Błąd: ${res.error || 'Nieznany błąd'}`);
    }
  }

    const filteredAds = ads.filter(({ ad }) =>
        ad.title.toLowerCase().includes(search.toLowerCase()) || search == ""
    );

  return (
    <div id="container">
        <header>
            <h1 className='title'>DEV GALLERY</h1>
        </header>
        <main>
        <div className='description'>
            <p className='description'>Witaj! Dev Gallery to miejsce, w którym możesz szybko podzielić się swoimi projektami programistycznymi</p>
            <p className='description'>Autorzy: Justyn Odyjas, Igor Maciejewski</p>
        </div>
        <button
            onClick={() => setShowForm(!showForm)}
            // style={{
            // marginBottom: '1rem',
            // backgroundColor: '#0077cc',
            // color: 'white',
            // border: 'none',
            // padding: '0.5rem 1rem',
            // borderRadius: '5px',
            // cursor: 'pointer',
            // }}
        >
            {showForm ? 'Anuluj' : 'Dodaj ogłoszenie'}
        </button>

        {showForm && (
            <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
            <label></label>
            <label htmlFor="title">Tytuł projektu:</label><br/>
            <input
                id="title"
                name="title"
                placeholder="Space Shooter"
                value={formState.title}
                onChange={handleChange}
                required
                minLength={4}
            />
            <label htmlFor="description">Opis:</label><br/>
            <textarea
                id="description"
                name="description"
                placeholder="Gra polegająca na strzelaniu w przeciwników"
                value={formState.description}
                onChange={handleChange}
                required
                minLength={16}
            />
            <label htmlFor="contact">Kontakt:</label><br/>
            <input
                id="contact"
                name="contact"
                placeholder="+12 123 123 123"
                value={formState.contact}
                onChange={handleChange}
                required
            />
            <label htmlFor="technologies">Technologie:</label><br/>
            <input
                id="technologies"
                name="technologies"
                placeholder="Unity Engine"
                value={formState.technologies}
                onChange={handleChange}
                required
            />
            <label htmlFor="dev_time">Czas rozwinięcia (miesiące):</label><br/>
            <input
                id="dev_time"
                name="development_time_months"
                placeholder="8"
                type="number"
                value={formState.development_time_months}
                onChange={handleChange}
                required
                min={0}
            />
            <label htmlFor="link">Link do projektu:</label><br/>
            <input
                id="link"
                name="link"
                placeholder="https://github.com/user/repo"
                value={formState.link}
                onChange={handleChange}
            />
            <button type="submit">Dodaj ogłoszenie</button>
            </form>
        )}

        {responseMessage && <p>{responseMessage}</p>}

        <section>
            <h2>Dodane ogłoszenia</h2>
            <input type="text" placeholder='Wpisz, aby wyszukać...' onChange={handleSearch}/>
            <ul>
            {(filteredAds.length === 0) && <li>Brak ogłoszeń</li>}
            
            {filteredAds
            .map(({ id, ad }) => (
                <li key={id.toString()}>
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
                <span class="material-symbols-outlined arrow green filled">keyboard_double_arrow_up</span>
                <span className="upvote-counter">10</span><span class="material-symbols-outlined arrow green unfilled" onClick={() => handleVote(true, 0)}>keyboard_double_arrow_up</span>
                <span class="material-symbols-outlined arrow red filled">keyboard_double_arrow_down</span>
                <span className="downvote-counter">10</span><span class="material-symbols-outlined arrow red unfilled" onClick={() => handleVote(false, 0)}>keyboard_double_arrow_down</span>
                </li>
            ))}
            </ul>
        </section>
        </main>
    </div>
  );
}

export default App;
