import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { universalSearchService, SearchResult, UniversalSearchResponse } from '../../services/universalSearchService';
import { debounce } from '../../hooks/usePerformanceMonitor';
import './UniversalSearch.css';

interface UniversalSearchProps {
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
}

const UniversalSearch: React.FC<UniversalSearchProps> = ({
  placeholder = "Search patients, inventory, users...",
  onResultSelect
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UniversalSearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('meditrack_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter(item => item !== searchQuery)
    ].slice(0, 5);

    setRecentSearches(updated);
    localStorage.setItem('meditrack_recent_searches', JSON.stringify(updated));
  }, [recentSearches]);

  // Debounced search function
  const debouncedSearch = useCallback((searchQuery: string) => {
    const searchFn = debounce(async (query: string) => {
      try {
        setIsLoading(true);
        const searchResults = await universalSearchService.search(query);
        setResults(searchResults);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    searchFn(searchQuery);
  }, []);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    if (result.url) {
      navigate(result.url);
    } else if (result.action) {
      result.action();
    }

    saveRecentSearch(query);
    setQuery('');
    setResults(null);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();

    onResultSelect?.(result);
  }, [navigate, query, saveRecentSearch, onResultSelect]);

  // Handle recent search selection
  const handleRecentSearchSelect = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    setIsOpen(true);
    debouncedSearch(recentQuery);
    inputRef.current?.focus();
  }, [debouncedSearch]);

  // Get all results flattened for keyboard navigation
  const getAllResults = useCallback((): SearchResult[] => {
    if (!results) return [];
    return results.categories.flatMap(category => category.results);
  }, [results]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const allResults = getAllResults();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < allResults.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : allResults.length - 1
        );
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && allResults[selectedIndex]) {
          handleResultSelect(allResults[selectedIndex]);
        } else if (query.trim()) {
          saveRecentSearch(query);
        }
        break;

      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;

      default:
        break;
    }
  }, [isOpen, selectedIndex, getAllResults, handleResultSelect, query, saveRecentSearch]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    setIsOpen(true);
    if (!query && !results) {
      // Show quick actions when focused with no query - use the service directly
      const getQuickActionsAsync = async () => {
        try {
          const quickActions = await universalSearchService.search('');
          setResults(quickActions);
        } catch (error) {
          console.error('Error loading quick actions:', error);
        }
      };
      getQuickActionsAsync();
    }
  }, [query, results]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  let currentIndex = 0;

  return (
    <div className="universal-search" ref={searchRef}>
      <div className="search-input-container">
        <div className="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="search-input"
          autoComplete="off"
          spellCheck={false}
        />

        {isLoading && (
          <div className="search-loading">
            <div className="loading-spinner-small"></div>
          </div>
        )}

        {query && (
          <button className="search-clear" onClick={clearSearch}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="search-dropdown">
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span>Recent Searches</span>
              </div>
              {recentSearches.map((recent, index) => (
                <button
                  key={`recent-${index}`}
                  className="search-result recent-search"
                  onClick={() => handleRecentSearchSelect(recent)}
                >
                  <div className="result-icon">🕒</div>
                  <div className="result-content">
                    <div className="result-title">{recent}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Search Results */}
          {results && results.categories.map((category) => (
            <div key={category.name} className="search-section">
              <div className="search-section-header">
                <span>{category.name}</span>
                {category.total > category.results.length && (
                  <span className="result-count">
                    {category.results.length} of {category.total}
                  </span>
                )}
              </div>

              {category.results.map((result) => {
                const isSelected = currentIndex === selectedIndex;
                const resultIndex = currentIndex++;

                return (
                  <button
                    key={result.id}
                    className={`search-result ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleResultSelect(result)}
                    onMouseEnter={() => setSelectedIndex(resultIndex)}
                  >
                    <div className="result-icon">
                      {result.icon}
                    </div>
                    <div className="result-content">
                      <div className="result-title">{result.title}</div>
                      {result.subtitle && (
                        <div className="result-subtitle">{result.subtitle}</div>
                      )}
                      {result.description && (
                        <div className="result-description">{result.description}</div>
                      )}
                      {result.metadata && (
                        <div className="result-metadata">{result.metadata}</div>
                      )}
                    </div>
                    <div className="result-type">
                      {result.type === 'action' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2"/>
                          <path d="M7 7h10v10" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {/* No Results */}
          {results && results.totalResults === 0 && query && (
            <div className="search-section">
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <div className="no-results-text">
                  No results found for "{query}"
                </div>
                <div className="no-results-hint">
                  Try searching for patients, medicines, or supplies
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {results && results.suggestions.length > 0 && (
            <div className="search-section">
              <div className="search-section-header">
                <span>Suggestions</span>
              </div>
              <div className="search-suggestions">
                {results.suggestions.map((suggestion, index) => (
                  <button
                    key={`suggestion-${index}`}
                    className="suggestion-pill"
                    onClick={() => handleRecentSearchSelect(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Tips */}
          {!query && !results && (
            <div className="search-section">
              <div className="search-tips">
                <div className="search-tip">
                  <strong>Quick tip:</strong> Try searching for patient names, medicine names, or use shortcuts like "add patient"
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UniversalSearch;