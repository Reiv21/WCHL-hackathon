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
  }

  async function initAuth() {
    try {
      const client = await AuthClient.create();
      setAuthClient(client);

      const isAuthenticated = await client.isAuthenticated();
      
      if (isAuthenticated) {
        const identity = client.getIdentity();
        setIsAuthenticated(true);
        setUserPrincipal(identity.getPrincipal().toString());

        await register();
        await loadAds();
      } else {
        await loadAds();
      }
    } catch (error) {
      console.error('Auth error:', error);
      await loadAds();
    }
  }

  async function login() {
    try {
      await authClient.login({
        identityProvider: 'https://identity.ic0.app',
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          setIsAuthenticated(true);
          setUserPrincipal(principal.toString());

          const authenticatedActor = createActor(canisterId, {
            agentOptions: { identity },
          });
          setActor(authenticatedActor);

          setResponseMessage('Login successful through Internet Identity!');
          await register();
        },
        onError: (error) => {
          console.error('Login error:', error);
          setResponseMessage('Login error: ' + (error.message || 'Unknown error'));
        }
      });
    } catch (error) {
      console.error('Login failure:', error);
      setResponseMessage('Cannot log in with Internet Identity. Check your internet connection.');
    }
  }

  async function logout() {
    await authClient.logout();
    setIsAuthenticated(false);
    setIsRegistered(false);
    setUserPrincipal(null);
    setActor(wchl_hackathon_backend);
    setUserVotes({});
    setResponseMessage('Logged out successfully!');
  }

  async function register() {
    try {
      const identity = authClient.getIdentity();
      const principal = identity.getPrincipal();
      
      setIsRegistered(true);
      setUserPrincipal(principal.toString());
      setResponseMessage('Registered successfully! (local mode)');
      
      await loadAds();
    } catch (error) {
      console.error('Registration error:', error);
      setResponseMessage('Registration failed');
    }
  }

  async function loadAds() {
    try {
      // Try to load from backend first
      const backendAds = await actor.get_ads_sorted_by_votes();
      console.log('Backend ads response:', backendAds);
      
      if (backendAds && Array.isArray(backendAds) && backendAds.length > 0) {
        // Convert backend format to frontend format
        const formattedAds = backendAds.map((item) => ({
          id: Number(item.id),
          ad: item.ad
        }));
        setAds(formattedAds);
        console.log('Loaded ads from backend:', formattedAds.length);
      } else {
        // Fallback to sample data if backend is empty
        const sampleAds = [
          {
            id: 1,
            ad: {
              title: "Frontend Developer - React/TypeScript",
              description: "We are looking for an experienced frontend developer to work on an e-commerce platform. Minimum 3 years of experience with React and TypeScript required.",
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
              description: "Looking for a developer to create a mobile app for a fitness startup. Experience with React Native and API integration is required.",
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
        
        // Try to add sample ads to backend
        for (const sampleAd of sampleAds) {
          try {
            await actor.add_ad(
              sampleAd.ad.title,
              sampleAd.ad.description,
              sampleAd.ad.contact,
              sampleAd.ad.technologies,
              sampleAd.ad.development_time_months,
              sampleAd.ad.link || ""
            );
          } catch (error) {
            console.log('Could not add sample ad to backend:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading ads from backend, using local fallback:', error);
      // Fallback to localStorage if backend fails
      const storedAds = localStorage.getItem('localAds');
      if (storedAds) {
        const parsedAds = JSON.parse(storedAds);
        setAds(parsedAds);
      } else {
        setAds([]);
      }
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }

  function handleSearch(event) {
    setSearch(event.target.value);
  }

  async function handleVote(isVoteUp, adId) {
    if (!isAuthenticated || !isRegistered) {
      setResponseMessage('You must be logged in and registered to vote.');
      return;
    }

    const voteType = isVoteUp ? 'Up' : 'Down';
    const currentVote = userVotes[adId];

    if (currentVote && ((voteType === 'Up' && currentVote.Up) || (voteType === 'Down' && currentVote.Down))) {
      setResponseMessage('You have already voted this way on this ad.');
      return;
    }

    try {
      // Try to vote on backend first
      const backendVoteType = isVoteUp ? { 'Up': null } : { 'Down': null };
      const response = await actor.vote_ad(BigInt(adId), backendVoteType);
      
      if (response.success) {
        // Update local state on successful backend vote
        const updatedAds = ads.map(adEntry => {
          if (adEntry.id === adId) {
            const newAd = { ...adEntry };
            if (currentVote) {
              if (currentVote.Up) newAd.ad.votes_up -= 1;
              if (currentVote.Down) newAd.ad.votes_down -= 1;
            }
            if (voteType === 'Up') newAd.ad.votes_up += 1;
            else newAd.ad.votes_down += 1;
            return newAd;
          }
          return adEntry;
        });

        const newUserVotes = { ...userVotes, [adId]: { [voteType]: true } };
        setUserVotes(newUserVotes);
        saveUserVotesToStorage(newUserVotes);
        setAds(updatedAds);
        
        setResponseMessage(`Voted ${isVoteUp ? 'up' : 'down'} successfully!`);
        
        // Reload ads from backend to get accurate counts
        await loadAds();
      } else {
        setResponseMessage('Vote failed: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Backend voting failed, using local fallback:', error);
      
      // Fallback to local voting
      const updatedAds = ads.map(adEntry => {
        if (adEntry.id === adId) {
          const newAd = { ...adEntry };
          if (currentVote) {
            if (currentVote.Up) newAd.ad.votes_up -= 1;
            if (currentVote.Down) newAd.ad.votes_down -= 1;
          }
          if (voteType === 'Up') newAd.ad.votes_up += 1;
          else newAd.ad.votes_down += 1;
          return newAd;
        }
        return adEntry;
      });

      const newUserVotes = { ...userVotes, [adId]: { [voteType]: true } };
      setUserVotes(newUserVotes);
      saveUserVotesToStorage(newUserVotes);
      setAds(updatedAds);
      localStorage.setItem('localAds', JSON.stringify(updatedAds));

      setResponseMessage(`Voted ${isVoteUp ? 'up' : 'down'}! (local mode)`);
    }
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
      setResponseMessage('You must be logged in and registered to post an ad.');
      return;
    }

    try {
      // Try to add to backend first
      const response = await actor.add_ad(
        title,
        description,
        contact,
        technologies,
        parseInt(development_time_months),
        link || ""
      );
      
      if (response.success) {
        setResponseMessage('Ad posted successfully to backend!');
        setFormState({
          title: '',
          description: '',
          contact: '',
          technologies: '',
          development_time_months: '',
          link: '',
        });
        setShowForm(false);
        
        // Reload ads from backend
        await loadAds();
      } else {
        throw new Error(response.error || 'Backend submission failed');
      }
    } catch (error) {
      console.error('Backend submission failed, using local fallback:', error);
      
      // Fallback to local storage
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

      setResponseMessage('Ad posted successfully! (local mode)');
      setFormState({
        title: '',
        description: '',
        contact: '',
        technologies: '',
        development_time_months: '',
        link: '',
      });
      setShowForm(false);
    }
  }

  const filteredAds = ads.filter(({ ad }) =>
    ad.title.toLowerCase().includes(search.toLowerCase()) || search === ""
  );

  return (
    <div id="container">
      <header>
        <h1 className='title'>DEV GALLERY</h1>
      </header>
      <main>
        <div className='description'>
          <p className='description'>Welcome! Dev Gallery is a place where you can quickly share your programming projects or find developers to collaborate with.</p>
          <p className='description'>Authors: Justyn Odyjas, Igor Maciejewski</p>
        </div>

        {!isAuthenticated ? (
          <button onClick={login}>
            Log in with Internet Identity
          </button>
        ) : (
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <p>Logged in as: {userPrincipal}</p>
            {isRegistered && <p style={{ color: '#04e05c' }}>✅ Registered</p>}
            <button onClick={logout}>Log out</button>
          </div>
        )}

        {isAuthenticated && isRegistered && (
          <button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : 'Add new ad'}
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
            <label htmlFor="title">Project title:</label><br />
            <input
              id="title"
              name="title"
              placeholder="Space Shooter"
              value={formState.title}
              onChange={handleChange}
              required
              minLength={4}
            />
            <label htmlFor="description">Description:</label><br />
            <textarea
              id="description"
              name="description"
              placeholder="A game about shooting enemies"
              value={formState.description}
              onChange={handleChange}
              required
              minLength={16}
            />
            <label htmlFor="contact">Contact:</label><br />
            <input
              id="contact"
              name="contact"
              placeholder="+12 123 123 123"
              value={formState.contact}
              onChange={handleChange}
              required
            />
            <label htmlFor="technologies">Technologies:</label><br />
            <input
              id="technologies"
              name="technologies"
              placeholder="Unity Engine"
              value={formState.technologies}
              onChange={handleChange}
              required
            />
            <label htmlFor="dev_time">Development time (months):</label><br />
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
            <label htmlFor="link">Project link:</label><br />
            <input
              id="link"
              name="link"
              placeholder="https://github.com/user/repo"
              value={formState.link}
              onChange={handleChange}
            />
            <button type="submit">Post Ad</button>
          </form>
        )}

        {responseMessage && <p>{responseMessage}</p>}

        <section>
          <h2>Posted Ads</h2>
          <input type="text" placeholder='Type to search...' onChange={handleSearch} />
          <ul>
            {(filteredAds.length === 0) && <li>No ads available</li>}
            {filteredAds.map(({ id, ad }) => {
              const currentVote = userVotes[id];
              const hasUpvoted = currentVote && currentVote.Up;
              const hasDownvoted = currentVote && currentVote.Down;

              return (
                <li key={id.toString()}>
                  <h3>{ad.title}</h3>
                  <p>{ad.description}</p>
                  <p><b>Contact:</b> {ad.contact}</p>
                  <p><b>Technologies:</b> {ad.technologies}</p>
                  <p><b>Development time:</b> {ad.development_time_months} month(s)</p>
                  {ad.link && (
                    <p>
                      <a href={ad.link} target="_blank" rel="noreferrer">
                        Project link
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
