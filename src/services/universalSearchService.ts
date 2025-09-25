import { optimizedInventoryService, optimizedActivityService } from './optimizedSupabaseService';
import { supabase } from '../lib/supabase';
import { cacheService, CACHE_TTL } from './cacheService';

export interface SearchResult {
  id: string;
  type: 'inventory' | 'user' | 'action' | 'archive' | 'log';
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: string;
  icon: string;
  url?: string;
  action?: () => void;
  priority: number; // Higher priority items appear first
  itemData?: any; // Store full item data for navigation purposes
}

export interface SearchCategory {
  name: string;
  results: SearchResult[];
  total: number;
}

export interface UniversalSearchResponse {
  query: string;
  totalResults: number;
  categories: SearchCategory[];
  suggestions: string[];
}

class UniversalSearchService {
  private searchCache = new Map<string, UniversalSearchResponse>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MIN_QUERY_LENGTH = 2;
  private readonly MAX_RESULTS_PER_CATEGORY = 5;

  // Quick actions and navigation shortcuts (excluding dashboard per requirement)
  private readonly QUICK_ACTIONS: SearchResult[] = [
    {
      id: 'nav-inventory',
      type: 'action',
      title: 'Inventory Management',
      subtitle: 'Manage medical supplies and equipment',
      icon: '📦',
      url: '/inventory',
      priority: 90
    },
    {
      id: 'nav-archives',
      type: 'action',
      title: 'Archives',
      subtitle: 'View archived records',
      icon: '📁',
      url: '/archives',
      priority: 85
    },
    {
      id: 'nav-logs',
      type: 'action',
      title: 'Activity Logs',
      subtitle: 'View system activity',
      icon: '📋',
      url: '/logs',
      priority: 80
    },
    {
      id: 'nav-profile',
      type: 'action',
      title: 'Profile Settings',
      subtitle: 'Manage your profile',
      icon: '⚙️',
      url: '/profile',
      priority: 70
    },
    {
      id: 'action-add-inventory',
      type: 'action',
      title: 'Add Inventory Item',
      subtitle: 'Add new medical supply',
      icon: '📦',
      action: () => console.log('Open add inventory modal'),
      priority: 65
    }
  ];

  // Common search terms and shortcuts (excluding dashboard and admin)
  private readonly SEARCH_SHORTCUTS: Record<string, string[]> = {
    'inventory': ['supplies', 'medicine', 'equipment', 'stock', 'medical', 'items'],
    'archive': ['archives', 'history', 'old', 'deleted', 'stored', 'past'],
    'logs': ['activity', 'audit', 'history', 'events', 'actions', 'tracking'],
    'profile': ['settings', 'account', 'preferences', 'personal'],
    'add': ['new', 'create', 'register', '+', 'insert'],
    'search': ['find', 'look', 'locate', 'query', 'filter'],
    'medical': ['medicine', 'drug', 'pharmaceutical', 'treatment', 'healthcare']
  };

  async search(query: string): Promise<UniversalSearchResponse> {
    if (!query || query.length < this.MIN_QUERY_LENGTH) {
      return this.getQuickActions(query);
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Check cache first
    const cacheKey = `search_${normalizedQuery}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [
        inventoryResults,
        actionResults,
        archiveResults,
        logResults
      ] = await Promise.all([
        this.searchInventory(normalizedQuery),
        this.searchActions(normalizedQuery),
        this.searchArchives(normalizedQuery),
        this.searchLogs(normalizedQuery)
      ]);

      const categories: SearchCategory[] = [
        {
          name: 'Quick Actions',
          results: actionResults,
          total: actionResults.length
        },
        {
          name: 'Inventory',
          results: inventoryResults.slice(0, this.MAX_RESULTS_PER_CATEGORY),
          total: inventoryResults.length
        },
        {
          name: 'Archives',
          results: archiveResults.slice(0, this.MAX_RESULTS_PER_CATEGORY),
          total: archiveResults.length
        },
        {
          name: 'Activity Logs',
          results: logResults.slice(0, this.MAX_RESULTS_PER_CATEGORY),
          total: logResults.length
        }
      ].filter(category => category.results.length > 0);

      const totalResults = categories.reduce((sum, cat) => sum + cat.total, 0);

      const response: UniversalSearchResponse = {
        query,
        totalResults,
        categories,
        suggestions: this.generateSuggestions(normalizedQuery)
      };

      // Cache the results
      this.searchCache.set(cacheKey, response);
      setTimeout(() => this.searchCache.delete(cacheKey), this.CACHE_DURATION);

      return response;
    } catch (error) {
      console.error('Search error:', error);
      return {
        query,
        totalResults: 0,
        categories: [],
        suggestions: []
      };
    }
  }

  private getQuickActions(query: string): UniversalSearchResponse {
    const filteredActions = query
      ? this.QUICK_ACTIONS.filter(action =>
          action.title.toLowerCase().includes(query.toLowerCase()) ||
          (action.subtitle || '').toLowerCase().includes(query.toLowerCase())
        )
      : this.QUICK_ACTIONS.slice(0, 6);

    return {
      query,
      totalResults: filteredActions.length,
      categories: [{
        name: 'Quick Actions',
        results: filteredActions,
        total: filteredActions.length
      }],
      suggestions: []
    };
  }


  private async searchInventory(query: string): Promise<SearchResult[]> {
    try {
      return await cacheService.cachedCall(
        'search',
        'inventory',
        async () => {
          const { data: items } = await optimizedInventoryService.getAllItems(); // Get ALL items for search

          const matchedItems = items.filter(item =>
            (item.code || '').toLowerCase().includes(query) ||
            (item.generic_name || '').toLowerCase().includes(query) ||
            (item.brand_name || '').toLowerCase().includes(query) ||
            (item.category || '').toLowerCase().includes(query) ||
            (item.classification || '').toLowerCase().includes(query)
          );

          return matchedItems
            .map(item => {
              // Calculate which page this item would be on based on different items per page settings
              const pageInfo = this.calculateItemPage(item, items, item.department, item.classification);

              return {
                id: `inventory_${item.id}`,
                type: 'inventory' as const,
                title: item.generic_name || item.brand_name,
                subtitle: `${item.category || 'General'} - ${item.classification}`,
                description: `Stock: ${item.stock_quantity} ${item.unit || 'units'}`,
                metadata: `Status: ${item.status?.replace('_', ' ')}`,
                icon: this.getInventoryIcon(item.classification),
                url: `/inventory?itemId=${item.id}&department=${item.department}&classification=${item.classification}&page=${pageInfo.defaultPage}&itemsPerPage=${pageInfo.defaultItemsPerPage}`,
                priority: 45,
                itemData: { ...item, pageInfo } // Store full item data with page info for navigation
              };
            })
            .sort((a: any, b: any) => b.priority - a.priority);
        },
        { query },
        CACHE_TTL.MEDIUM
      );
    } catch (error) {
      console.error('Error searching inventory:', error);
      return [];
    }
  }


  private async searchArchives(query: string): Promise<SearchResult[]> {
    try {
      return await cacheService.cachedCall(
        'search',
        'archives',
        async () => {
          // Get archived inventory items (this is what ArchivesPage actually shows)
          const { data: archivedItems, error } = await supabase
            .from('inventory_items')
            .select('*')
            .eq('status', 'archived');

          if (error) {
            console.error('Error fetching archived items:', error);
            return [];
          }

          const matchedItems = archivedItems.filter((item: any) =>
            (item.generic_name || '').toLowerCase().includes(query) ||
            (item.brand_name || '').toLowerCase().includes(query) ||
            (item.code || '').toLowerCase().includes(query) ||
            (item.category || '').toLowerCase().includes(query) ||
            (item.notes || '').toLowerCase().includes(query)
          );

          return matchedItems
            .map((item: any) => {
              // Calculate which page this archived item would be on
              const pageInfo = this.calculateArchivePage(item, archivedItems);

              return {
                id: `archive_inv_${item.id}`,
                type: 'archive' as const,
                title: item.generic_name || item.brand_name || 'Unknown Item',
                subtitle: 'Archived Inventory Item',
                description: `Category: ${item.category || 'General'} - ${item.classification || 'Unknown'}`,
                metadata: `Archived: ${new Date(item.updated_at || item.created_at).toLocaleDateString()}`,
                icon: this.getInventoryIcon(item.classification),
                url: `/archives?highlightId=inv_${item.id}&page=${pageInfo.defaultPage}&itemsPerPage=${pageInfo.defaultItemsPerPage}`,
                priority: 35,
                itemData: { ...item, pageInfo }
              };
            })
            .sort((a: any, b: any) => b.priority - a.priority);
        },
        { query },
        CACHE_TTL.MEDIUM
      );
    } catch (error) {
      console.error('Error searching archives:', error);
      return [];
    }
  }

  private async searchLogs(query: string): Promise<SearchResult[]> {
    try {
      return await cacheService.cachedCall(
        'search',
        'logs',
        async () => {
          const { data: logs } = await optimizedActivityService.getLogs(); // Get ALL logs for search

          const matchedLogs = logs.filter((log: any) =>
            (log.action || '').toLowerCase().includes(query) ||
            (log.description || '').toLowerCase().includes(query) ||
            (log.category || '').toLowerCase().includes(query) ||
            (log.users?.username || '').toLowerCase().includes(query) ||
            (log.users?.first_name || '').toLowerCase().includes(query) ||
            (log.users?.last_name || '').toLowerCase().includes(query)
          );

          return matchedLogs
            .map((log: any) => {
              // Calculate which page this log would be on based on pagination
              const pageInfo = this.calculateLogPage(log, logs);

              return {
                id: `log_${log.id}`,
                type: 'log' as const,
                title: log.action || 'Activity Log',
                subtitle: log.description || 'System activity',
                description: `User: ${log.users?.username || 'System'}`,
                metadata: `${new Date(log.timestamp).toLocaleDateString()} - ${log.severity || 'info'}`,
                icon: this.getLogIcon(log.severity),
                url: `/logs?highlightId=${log.id}&page=${pageInfo.defaultPage}&itemsPerPage=${pageInfo.defaultItemsPerPage}`,
                priority: 30,
                itemData: { ...log, pageInfo }
              };
            })
            .sort((a: any, b: any) => new Date(b.itemData.timestamp).getTime() - new Date(a.itemData.timestamp).getTime())
            .slice(0, 10); // Limit logs to recent 10
        },
        { query },
        CACHE_TTL.SHORT
      );
    } catch (error) {
      console.error('Error searching logs:', error);
      return [];
    }
  }


  private searchActions(query: string): SearchResult[] {
    return this.QUICK_ACTIONS
      .filter(action =>
        action.title.toLowerCase().includes(query) ||
        (action.subtitle || '').toLowerCase().includes(query) ||
        this.matchesShortcut(query, action.title.toLowerCase())
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3);
  }

  private matchesShortcut(query: string, actionTitle: string): boolean {
    for (const [key, shortcuts] of Object.entries(this.SEARCH_SHORTCUTS)) {
      if (actionTitle.includes(key) && shortcuts.some(shortcut => shortcut.includes(query))) {
        return true;
      }
    }
    return false;
  }

  private generateSuggestions(query: string): string[] {
    const suggestions: string[] = [];

    // Add shortcuts that start with the query
    for (const [key, shortcuts] of Object.entries(this.SEARCH_SHORTCUTS)) {
      if (key.startsWith(query) && !suggestions.includes(key)) {
        suggestions.push(key);
      }
      shortcuts.forEach(shortcut => {
        if (shortcut.startsWith(query) && !suggestions.includes(shortcut)) {
          suggestions.push(shortcut);
        }
      });
    }

    // Add common medical terms
    const medicalTerms = [
      'medicine', 'supplies', 'equipment', 'inventory', 'stock'
    ];

    medicalTerms.forEach(term => {
      if (term.startsWith(query) && !suggestions.includes(term)) {
        suggestions.push(term);
      }
    });

    return suggestions.slice(0, 5);
  }

  private getInventoryIcon(classification?: string): string {
    switch ((classification || '').toLowerCase()) {
      case 'medicines':
        return '💊';
      case 'supplies':
        return '🧰';
      case 'equipment':
        return '🔬';
      default:
        return '📦';
    }
  }

  private getArchiveIcon(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'inventory item':
      case 'inventory':
        return '📦';
      case 'medical record':
      case 'record':
        return '📋';
      case 'patient':
        return '👤';
      case 'user':
        return '👨‍⚕️';
      default:
        return '📁';
    }
  }

  private getLogIcon(severity?: string): string {
    switch ((severity || '').toLowerCase()) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'info':
      default:
        return '📝';
    }
  }

  // Calculate which page an archived item would be on based on sorting and pagination
  private calculateArchivePage(targetItem: any, allArchivedItems: any[]): { defaultPage: number; defaultItemsPerPage: number; pagesByItemsPerPage: Record<number, number> } {
    // Sort archived items the same way as ArchivesPage does (by archivedDate desc by default)
    const sortedItems = allArchivedItems.sort((a, b) => {
      const aDate = new Date(a.updated_at || a.created_at).getTime();
      const bDate = new Date(b.updated_at || b.created_at).getTime();
      return bDate - aDate; // desc order (newest first)
    });

    // Find the index of the target item in the sorted list
    const itemIndex = sortedItems.findIndex(item => item.id === targetItem.id);

    if (itemIndex === -1) {
      // Item not found, return page 1
      return {
        defaultPage: 1,
        defaultItemsPerPage: 100,
        pagesByItemsPerPage: { 10: 1, 25: 1, 50: 1, 100: 1 }
      };
    }

    // Calculate page numbers for different items per page settings
    const itemsPerPageOptions = [10, 25, 50, 100];
    const pagesByItemsPerPage: Record<number, number> = {};

    itemsPerPageOptions.forEach(itemsPerPage => {
      const page = Math.floor(itemIndex / itemsPerPage) + 1;
      pagesByItemsPerPage[itemsPerPage] = page;
    });

    // Use 100 as default (matches ArchivesPage default)
    const defaultItemsPerPage = 100;
    const defaultPage = pagesByItemsPerPage[defaultItemsPerPage];

    return {
      defaultPage,
      defaultItemsPerPage,
      pagesByItemsPerPage
    };
  }

  // Calculate which page a log would be on based on sorting and pagination
  private calculateLogPage(targetLog: any, allLogs: any[]): { defaultPage: number; defaultItemsPerPage: number; pagesByItemsPerPage: Record<number, number> } {
    // Sort logs the same way as LogsPage does (by timestamp desc by default)
    const sortedLogs = allLogs.sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime();
      const bTime = new Date(b.timestamp).getTime();
      return bTime - aTime; // desc order (newest first)
    });

    // Find the index of the target log in the sorted list
    const logIndex = sortedLogs.findIndex(log => log.id === targetLog.id);

    if (logIndex === -1) {
      // Log not found, return page 1
      return {
        defaultPage: 1,
        defaultItemsPerPage: 100,
        pagesByItemsPerPage: { 10: 1, 25: 1, 50: 1, 100: 1 }
      };
    }

    // Calculate page numbers for different items per page settings
    const itemsPerPageOptions = [10, 25, 50, 100];
    const pagesByItemsPerPage: Record<number, number> = {};

    itemsPerPageOptions.forEach(itemsPerPage => {
      const page = Math.floor(logIndex / itemsPerPage) + 1;
      pagesByItemsPerPage[itemsPerPage] = page;
    });

    // Use 100 as default (matches LogsPage default)
    const defaultItemsPerPage = 100;
    const defaultPage = pagesByItemsPerPage[defaultItemsPerPage];

    return {
      defaultPage,
      defaultItemsPerPage,
      pagesByItemsPerPage
    };
  }

  // Calculate which page an item would be on based on sorting and pagination
  private calculateItemPage(targetItem: any, allItems: any[], department: string, classification: string): { defaultPage: number; defaultItemsPerPage: number; pagesByItemsPerPage: Record<number, number> } {
    // Filter items to match the same department and classification as the target
    // This matches the filtering logic in InventoryPage
    const filteredItems = allItems.filter(item =>
      item.department === department &&
      item.classification === classification &&
      item.status !== 'archived' // Exclude archived items as they won't show on inventory page
    );

    // Sort items the same way as the optimizedSupabaseService getAllItems method
    // which sorts by generic_name ascending (this is the default sort when no sortColumn is set)
    const sortedItems = filteredItems.sort((a, b) => {
      const aName = (a.generic_name || '').toLowerCase();
      const bName = (b.generic_name || '').toLowerCase();
      if (aName < bName) return -1;
      if (aName > bName) return 1;
      return 0;
    });

    // Find the index of the target item in the sorted list
    const itemIndex = sortedItems.findIndex(item => item.id === targetItem.id);

    if (itemIndex === -1) {
      // Item not found, return page 1
      return {
        defaultPage: 1,
        defaultItemsPerPage: 100,
        pagesByItemsPerPage: { 10: 1, 25: 1, 50: 1, 100: 1 }
      };
    }

    // Calculate page numbers for different items per page settings
    const itemsPerPageOptions = [10, 25, 50, 100];
    const pagesByItemsPerPage: Record<number, number> = {};

    itemsPerPageOptions.forEach(itemsPerPage => {
      const page = Math.floor(itemIndex / itemsPerPage) + 1;
      pagesByItemsPerPage[itemsPerPage] = page;
    });

    // Use 100 as default (matches InventoryPage default)
    const defaultItemsPerPage = 100;
    const defaultPage = pagesByItemsPerPage[defaultItemsPerPage];

    return {
      defaultPage,
      defaultItemsPerPage,
      pagesByItemsPerPage
    };
  }

  // Clear search cache (useful for data updates)
  clearCache(): void {
    this.searchCache.clear();
    cacheService.clearByPattern('search_');
  }
}

export const universalSearchService = new UniversalSearchService();