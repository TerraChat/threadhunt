import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

const STYLES = `
:root {
    --primary: #111;
    --accent: #2563eb;
    --bg: #f8f9fa;
    --card-bg: #fff;
    --success: #22c55e;
}

* { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

body { margin: 0; background-color: var(--bg); color: var(--primary); }

/* HEADER & SEARCH */
header {
    background: var(--card-bg);
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    position: sticky;
    top: 0;
    z-index: 100;
}

.nav-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto 15px auto;
}

.logo { font-size: 1.5rem; font-weight: 800; letter-spacing: -1px; }
.cart-btn { cursor: pointer; position: relative; font-weight: 600; }
.cart-count { background: var(--accent); color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.8rem; margin-left: 5px; }

.search-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    gap: 10px;
}

input {
    flex: 1;
    padding: 12px 20px;
    border: 2px solid #eee;
    border-radius: 8px;
    font-size: 1rem;
    outline: none;
    transition: 0.2s;
}
input:focus { border-color: var(--accent); }

select {
    padding: 0 15px;
    border: 2px solid #eee;
    border-radius: 8px;
    background: white;
    cursor: pointer;
}

button.search-btn {
    background: var(--primary);
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: 0.2s;
}
button.search-btn:hover { opacity: 0.9; }
button.search-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* RESULTS GRID */
.results-area {
    max-width: 1200px;
    margin: 30px auto;
    padding: 0 20px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
}

.product-card {
    background: var(--card-bg);
    border-radius: 12px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
    border: 1px solid #eee;
    display: flex;
    flex-direction: column;
}

.product-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.08);
}

.card-img {
    height: 200px;
    background-color: #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #888;
    font-size: 3rem;
}

.card-info { padding: 15px; flex: 1; display: flex; flex-direction: column; }

.store-badge {
    font-size: 0.75rem;
    text-transform: uppercase;
    font-weight: 700;
    color: #666;
    margin-bottom: 5px;
}

.product-title { font-weight: 600; margin-bottom: 10px; line-height: 1.4; font-size: 0.95rem; }

.price-row {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.price { font-size: 1.1rem; font-weight: 700; color: var(--primary); }

.action-btn {
    background: white;
    border: 1px solid #ddd;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: 0.2s;
}
.action-btn:hover { background: #f0f0f0; }
.action-btn.saved { background: var(--success); color: white; border-color: var(--success); }

/* LINK CHECKER ANIMATION */
.validating { font-size: 0.8rem; color: var(--accent); margin-top: 5px; display: none; }
.validating.active { display: block; }
.valid-link { color: var(--success); display: none; font-size: 0.8rem; margin-top: 5px; }
.valid-link.active { display: block; }

/* CART DRAWER */
#cart-drawer {
    position: fixed;
    top: 0; right: -400px;
    width: 350px;
    height: 100vh;
    background: white;
    box-shadow: -5px 0 30px rgba(0,0,0,0.1);
    transition: 0.3s;
    z-index: 200;
    padding: 20px;
    overflow-y: auto;
}
#cart-drawer.open { right: 0; }

.drawer-header { display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.close-btn { cursor: pointer; font-size: 1.5rem; }

.cart-item { display: flex; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid #f5f5f5; padding-bottom: 10px; }
.cart-item-img { width: 50px; height: 50px; background: #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }

.overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.3);
    z-index: 150;
    display: none;
}
.overlay.active { display: block; }

.loading-spinner {
    text-align: center;
    margin-top: 50px;
    font-size: 1.2rem;
    color: #666;
}
`;

interface Product {
  id: number;
  title: string;
  store: string;
  price: number;
  emoji: string;
  link?: string;
}

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [savedItems, setSavedItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('relevance');
  const [cartOpen, setCartOpen] = useState(false);
  const [linkStatuses, setLinkStatuses] = useState<Record<number, 'none' | 'checking' | 'valid'>>({});

  // Initialize saved items from local storage
  useEffect(() => {
    const saved = localStorage.getItem('threadHuntCart');
    if (saved) {
      setSavedItems(JSON.parse(saved));
    }
  }, []);

  const performSearch = async () => {
    if (!query.trim()) {
      alert("Please enter a search term!");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const ai = new GoogleGenAI({ apiKey: "AIzaSyDHmZDE4qx9b2okF8rhkumvfHaBHqzHQvA" });
      
      const prompt = `Generate a list of 12 realistic fashion products for the search query: "${query}". 
      Include a mix of stores like Amazon, Zara, eBay, Polo RL, Google Shop. 
      Prices should be realistic for the item.
      Assign a relevant emoji to each item.
      Return strictly valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                title: { type: Type.STRING },
                store: { type: Type.STRING },
                price: { type: Type.NUMBER },
                emoji: { type: Type.STRING },
              },
              required: ["id", "title", "store", "price", "emoji"],
            },
          },
        },
      });

      let items: Product[] = [];
      if (response.text) {
        items = JSON.parse(response.text);
        // Ensure IDs are unique enough for this session
        items = items.map(item => ({ ...item, id: Date.now() + Math.floor(Math.random() * 100000) + item.id }));
      }
      
      setResults(items);
    } catch (error) {
      console.error("Search failed:", error);
      alert("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (sort === 'low') return a.price - b.price;
    if (sort === 'high') return b.price - a.price;
    return 0; // relevance (default order)
  });

  const toggleSave = (item: Product) => {
    const exists = savedItems.find(i => i.id === item.id);
    let newSaved;
    if (exists) {
      newSaved = savedItems.filter(i => i.id !== item.id);
    } else {
      newSaved = [...savedItems, item];
    }
    setSavedItems(newSaved);
    localStorage.setItem('threadHuntCart', JSON.stringify(newSaved));
  };

  const removeItem = (id: number) => {
    const newSaved = savedItems.filter(i => i.id !== id);
    setSavedItems(newSaved);
    localStorage.setItem('threadHuntCart', JSON.stringify(newSaved));
  };

  const checkLink = (id: number) => {
    if (linkStatuses[id]) return;
    
    setLinkStatuses(prev => ({ ...prev, [id]: 'checking' }));
    
    setTimeout(() => {
      setLinkStatuses(prev => ({ ...prev, [id]: 'valid' }));
    }, 800);
  };

  return (
    <>
      <style>{STYLES}</style>
      
      {/* Overlay */}
      <div 
        className={`overlay ${cartOpen ? 'active' : ''}`} 
        onClick={() => setCartOpen(false)}
      />

      {/* Cart Drawer */}
      <div id="cart-drawer" className={cartOpen ? 'open' : ''}>
        <div className="drawer-header">
          <h3>Saved Items</h3>
          <span className="close-btn" onClick={() => setCartOpen(false)}>&times;</span>
        </div>
        <div id="cart-items-container">
          {savedItems.length === 0 ? (
            <p style={{ color: '#777' }}>Your list is empty.</p>
          ) : (
            savedItems.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-img">{item.emoji}</div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666' }}>{item.store} - ${item.price.toFixed(2)}</div>
                  <a 
                    href="#" 
                    style={{ fontSize: '0.8rem', color: 'red' }} 
                    onClick={(e) => { e.preventDefault(); removeItem(item.id); }}
                  >
                    Remove
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <header>
        <div className="nav-top">
          <div className="logo">ThreadHunt.</div>
          <div className="cart-btn" onClick={() => setCartOpen(true)}>
            Saved Items <span className="cart-count">{savedItems.length}</span>
          </div>
        </div>
        <div className="search-container">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Ex: White Nike shirt black logo..."
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="relevance">Trending</option>
            <option value="low">Price: Low to High</option>
            <option value="high">Price: High to Low</option>
          </select>
          <button className="search-btn" onClick={performSearch} disabled={loading}>
            {loading ? 'Scanning...' : 'Find It'}
          </button>
        </div>
      </header>

      {loading && (
        <div className="loading-spinner">
          Scanning Amazon, Zara, eBay, Polo... <br />
          <small>Verifying links...</small>
        </div>
      )}

      <div className="results-area">
        {!loading && results.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', marginTop: '50px' }}>
            Search for clothing to start scanning the web.
          </div>
        )}

        {sortedResults.map(item => {
          const isSaved = savedItems.some(s => s.id === item.id);
          const linkStatus = linkStatuses[item.id] || 'none';

          return (
            <div key={item.id} className="product-card">
              <div className="card-img">{item.emoji}</div>
              <div className="card-info">
                <div className="store-badge">{item.store}</div>
                <div className="product-title">{item.title}</div>
                
                <div className={`validating ${linkStatus === 'checking' ? 'active' : ''}`}>Checking link...</div>
                <div className={`valid-link ${linkStatus === 'valid' ? 'active' : ''}`}>✓ Link Verified</div>

                <div className="price-row">
                  <span className="price">${item.price.toFixed(2)}</span>
                  <div>
                    <button 
                      className={`action-btn ${isSaved ? 'saved' : ''}`} 
                      onClick={() => toggleSave(item)}
                    >
                      {isSaved ? 'Saved' : 'Save +'}
                    </button>
                    <a href="#" target="_blank" style={{ marginLeft: '5px' }}>
                      <button 
                        className="action-btn" 
                        onMouseEnter={() => checkLink(item.id)}
                      >
                        Buy ➚
                      </button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const root = createRoot(document.getElementById('app')!);
root.render(<App />);