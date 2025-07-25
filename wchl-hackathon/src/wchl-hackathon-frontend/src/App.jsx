import { useState, useEffect } from 'react';
import { wchl_hackathon_backend } from 'declarations/wchl-hackathon-backend';
import { AuthClient } from '@dfinity/auth-client';
import { createActor } from 'declarations/wchl-hackathon-backend';
import { canisterId } from 'declarations/wchl-hackathon-backend';

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
  
  // Authentication states
  const [authClient, setAuthClient] = useState(null);
  const [actor, setActor] = useState(wchl_hackathon_backend);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userPrincipal, setUserPrincipal] = useState(null);
  const [userVotes, setUserVotes] = useState({});

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    // Load user votes when user is authenticated
    if (isAuthenticated && userPrincipal) {
      loadUserVotesFromStorage();
    }
  }, [isAuthenticated, userPrincipal]);

  function loadUserVotesFromStorage() {
    if (!userPrincipal) return;
    
    const storageKey = `userVotes_${userPrincipal}`;
    const storedVotes = localStorage.getItem(storageKey);
    if (storedVotes) {
      try {
        const parsedVotes = JSON.parse(storedVotes);
        setUserVotes(parsedVotes);
        console.log('Loaded user votes from storage:', parsedVotes);
      } catch (error) {
        console.error('Error parsing stored votes:', error);
        setUserVotes({});
      }
    }
  }

  function saveUserVotesToStorage(votes) {
    if (!userPrincipal) return;
    
    const storageKey = `userVotes_${userPrincipal}`;
    localStorage.setItem(storageKey, JSON.stringify(votes));
    console.log('Saved user votes to storage:', votes);
  }

  async function initAuth() {
    console.log('Initializing authentication...');
    try {
      const client = await AuthClient.create();
      setAuthClient(client);

      const isAuthenticated = await client.isAuthenticated();
      console.log('Initial authentication status:', isAuthenticated);
      
      if (isAuthenticated) {
        const identity = client.getIdentity();
        console.log('User is authenticated, identity:', identity.getPrincipal().toString());
        setIsAuthenticated(true);
        setUserPrincipal(identity.getPrincipal().toString());

        await register();
        await loadAds();
      } else {
        console.log('User not authenticated');
        await loadAds();
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      await loadAds();
    }
  }

  async function login() {
    console.log('Starting login process...');
    try {
      await authClient.login({
        identityProvider: 'https://identity.ic0.app',
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
        onSuccess: async () => {
          console.log('Login successful!');
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          console.log('User principal:', principal.toString());
          
          setIsAuthenticated(true);
          setUserPrincipal(principal.toString());
          
          const authenticatedActor = createActor(canisterId, {
            agentOptions: { identity },
          });
          setActor(authenticatedActor);
          
          setResponseMessage('Zalogowano pomyślnie przez Internet Identity!');
          await register();
        },
        onError: (error) => {
          console.error('Internet Identity login failed:', error);
          setResponseMessage('Błąd podczas logowania: ' + (error.message || 'Nieznany błąd'));
        }
      });
    } catch (error) {
      console.error('Login failed:', error);
      setResponseMessage('Nie można zalogować się przez Internet Identity. Sprawdź połączenie internetowe.');
    }
  }

  async function logout() {
    await authClient.logout();
    setIsAuthenticated(false);
    setIsRegistered(false);
    setUserPrincipal(null);
    setActor(wchl_hackathon_backend);
    setUserVotes({});
    setResponseMessage('Wylogowano pomyślnie!');
  }

  async function register() {
    console.log('Attempting to register user...');
    try {
      // Always use local registration mode
      console.log('Using local registration mode');
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal();
      
      setIsRegistered(true);
      setUserPrincipal(principal.toString());
      setResponseMessage('Zarejestrowano pomyślnie! (tryb lokalny)');
      
      await loadAds();
    } catch (error) {
      console.error('Registration error:', error);
      setResponseMessage('Błąd podczas rejestracji');
    }
  }

  async function loadAds() {
    console.log('Loading ads...');
    try {
      // Always load from localStorage
      const storedAds = localStorage.getItem('localAds');
      if (storedAds) {
        const parsedAds = JSON.parse(storedAds);
        setAds(parsedAds);
        console.log('Loaded local ads:', parsedAds.length);
      } else {
        // provide sample ads if none exist
        const sampleAds = [
          {
            id: 1,
            ad: {
              title: "Frontend Developer - React/TypeScript",
              description: "Poszukujemy doświadczonego frontend developera do pracy nad platformą e-commerce. Wymagane minimum 3 lata doświadczenia z React i TypeScript.",
              contact: "hr@techcompany.pl",
              technologies: "React, TypeScript, Next.js, Tailwind CSS",
              development_time_months: 6,
              link: "https://techcompany.pl/careers",
              owner: "sample-user-1",
              votes_up: 5,
              votes_down: 1,
              created_at: Date.now() - 3600000
            }
          },
          {
            id: 2,
            ad: {
              title: "Mobile App Developer - React Native",
              description: "Szukam developera do stworzenia aplikacji mobilnej dla fitness startup. Doświadczenie z React Native i integracją z API.",
              contact: "jobs@fitnessapp.com",
              technologies: "React Native, TypeScript, Firebase",
              development_time_months: 4,
              link: "https://fitnessapp.com",
              owner: "sample-user-2",
              votes_up: 8,
              votes_down: 0,
              created_at: Date.now() - 7200000
            }
          }
        ];
        setAds(sampleAds);
        localStorage.setItem('localAds', JSON.stringify(sampleAds));
        console.log('Created sample ads');
      }
    } catch (error) {
      console.error('Error loading ads:', error);
      setAds([]);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }

  function handleSearch(event) {
    setSearch(event.target.value);
  }

  function handleVote(isVoteUp, adId) {
    if (!isAuthenticated || !isRegistered) {
      setResponseMessage('Musisz być zalogowany i zarejestrowany, aby głosować.');
      return;
    }

    const voteType = isVoteUp ? 'Up' : 'Down';
    const currentVote = userVotes[adId];
    
    // Check if user already voted this way
    if (currentVote && ((voteType === 'Up' && currentVote.Up) || (voteType === 'Down' && currentVote.Down))) {
      setResponseMessage('Już zagłosowałeś w ten sposób na to ogłoszenie.');
      return;
    }
    
    const updatedAds = ads.map(adEntry => {
      if (adEntry.id === adId) {
        const newAd = { ...adEntry };
        
        // Remove previous vote if exists
        if (currentVote) {
          if (currentVote.Up) {
            newAd.ad.votes_up -= 1;
          } else if (currentVote.Down) {
            newAd.ad.votes_down -= 1;
          }
        }
        
        // Add new vote
        if (voteType === 'Up') {
          newAd.ad.votes_up += 1;
        } else {
          newAd.ad.votes_down += 1;
        }
        
        return newAd;
      }
      return adEntry;
    });
    
    // Update user votes
    const newUserVotes = { ...userVotes, [adId]: { [voteType]: true } };
    setUserVotes(newUserVotes);
    saveUserVotesToStorage(newUserVotes);
    
    // Update ads
    setAds(updatedAds);
    localStorage.setItem('localAds', JSON.stringify(updatedAds));
    
    setResponseMessage(`Zagłosowano ${isVoteUp ? 'za' : 'przeciw'}!`);
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

    if (!isAuthenticated || !isRegistered) {
      setResponseMessage('Musisz być zalogowany i zarejestrowany, aby dodać ogłoszenie.');
      return;
    }

    try {
      const newAd = {
        id: Date.now(),
        ad: {
          title,
          description,
          contact,
          technologies,
          development_time_months: Number(development_time_months),
          link,
          owner: userPrincipal,
          votes_up: 0,
          votes_down: 0,
          created_at: Date.now(),
        }
      };
      
      const newAds = [...ads, newAd];
      setAds(newAds);
      localStorage.setItem('localAds', JSON.stringify(newAds));

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
    } catch (error) {
      console.error('Submit error:', error);
      setResponseMessage(`Błąd: ${error.message || 'Nieznany błąd'}`);
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
            <p className='description'>Witaj! Dev Gallery to miejsce, w którym możesz szybko podzielić się swoimi projektami programistycznymi lub znaleźć developerów do pomocy</p>
            <p className='description'>Autorzy: Justyn Odyjas, Igor Maciejewski</p>
        </div>

        {/* Authentication Section */}
        {!isAuthenticated ? (
          <button onClick={login}>
            Zaloguj przez Internet Identity
          </button>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p>Zalogowany jako: {userPrincipal}</p>
            {isRegistered && <p style={{color: '#04e05c'}}>✅ Zarejestrowany</p>}
            <button onClick={logout}>Wyloguj</button>
          </div>
        )}

        {isAuthenticated && isRegistered && (
          <button
              onClick={() => setShowForm(!showForm)}
          >
              {showForm ? 'Anuluj' : 'Dodaj ogłoszenie'}
          </button>
        )}

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
            .map(({ id, ad }) => {
                const currentVote = userVotes[id];
                const hasUpvoted = currentVote && currentVote.Up;
                const hasDownvoted = currentVote && currentVote.Down;
                
                return (
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
                <span 
                  className={`material-symbols-outlined arrow green ${hasUpvoted ? 'filled' : 'unfilled'}`}
                  onClick={() => handleVote(true, id)}
                  style={{ cursor: isAuthenticated && isRegistered ? 'pointer' : 'not-allowed' }}
                >
                  keyboard_double_arrow_up
                </span>
                <span className="upvote-counter">{ad.votes_up}</span>
                <span 
                  className={`material-symbols-outlined arrow red ${hasDownvoted ? 'filled' : 'unfilled'}`}
                  onClick={() => handleVote(false, id)}
                  style={{ cursor: isAuthenticated && isRegistered ? 'pointer' : 'not-allowed' }}
                >
                  keyboard_double_arrow_down
                </span>
                <span className="downvote-counter">{ad.votes_down}</span>
                </li>
                );
            })}
            </ul>
        </section>
        </main>
    </div>
  );
}

export default App;
